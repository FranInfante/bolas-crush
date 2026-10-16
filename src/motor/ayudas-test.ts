// Ayudas solo para tests: crean una Partida desde una matriz de sabores.
import { Partida } from './partida.ts';
import type { Celda, Nivel, Pos, Especial, Paso } from './tipos.ts';

/**
 * Cada carácter de `filas`: dígito = bola de ese sabor · '.' hueco · 'e'/'E' escarcha 1/2 · 'p' carapina.
 * Los refrescos que caen tras una jugada son sabores únicos (10, 11, …) para que no formen matches sin querer.
 */
export function partidaDesde(filas: string[], extra: Partial<Nivel> = {}): Partida {
  const forma = filas.map((fila) =>
    [...fila].map((ch) => (ch === '.' ? '.' : ch === 'e' ? 'e' : ch === 'E' ? 'E' : ch === 'p' ? 'c' : 'o')).join(''),
  );
  const nivel: Nivel = {
    id: 0, nombre: 'test', forma, sabores: 6, movimientos: 20,
    objetivo: { tipo: 'puntos' }, estrellas: [100000, 200000, 300000], semilla: 1, ...extra,
  };
  const p = new Partida(nivel);
  let id = 100000;
  filas.forEach((fila, f) => [...fila].forEach((ch, c) => {
    const celda = p.tablero[f][c];
    celda.ficha = null;
    if (/\d/.test(ch)) celda.ficha = { id: id++, tipo: 'bola', sabor: Number(ch), especial: 'ninguno' };
    if (ch === 'p') celda.ficha = { id: id++, tipo: 'carapina', sabor: -1, especial: 'ninguno' };
  }));
  let n = 10;
  p.generador = () => n++;
  return p;
}

export function especial(p: Partida, f: number, c: number, e: Especial): void {
  const ficha = p.tablero[f][c].ficha!;
  ficha.especial = e;
  if (e === 'bolaBolas') ficha.sabor = -1;
}
export function poner(p: Partida, f: number, c: number, parcial: Partial<Celda>): void {
  Object.assign(p.tablero[f][c], parcial);
}
export const pos = (f: number, c: number): Pos => ({ f, c });
export const tipos = (pasos: Paso[]): string[] => pasos.map((x) => x.tipo);
export function de<T extends Paso['tipo']>(pasos: Paso[], tipo: T): Extract<Paso, { tipo: T }>[] {
  return pasos.filter((x) => x.tipo === tipo) as Extract<Paso, { tipo: T }>[];
}
/** Sabores o '.' por celda, para comparar tableros enteros. */
export function ver(p: Partida): string[] {
  return p.tablero.map((fila) => fila.map((c) => (!c.existe ? '.' : c.ficha ? (c.ficha.tipo === 'carapina' ? 'p' : String(c.ficha.sabor)) : '_')).join(' '));
}
