// RNG con semilla (mulberry32): misma semilla = misma partida, así los niveles y los tests son reproducibles.
export interface Azar {
  /** Real en [0, 1). */
  siguiente(): number;
  /** Entero en [0, n). */
  entero(n: number): number;
  elegir<T>(lista: readonly T[]): T;
  /** Fisher-Yates in situ. */
  barajar<T>(lista: T[]): T[];
}

export function crearAzar(semilla: number): Azar {
  let s = semilla >>> 0;
  const siguiente = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (n: number): number => Math.floor(siguiente() * n);
  return {
    siguiente,
    entero,
    elegir: (lista) => lista[entero(lista.length)],
    barajar: (lista) => {
      for (let i = lista.length - 1; i > 0; i--) {
        const j = entero(i + 1);
        [lista[i], lista[j]] = [lista[j], lista[i]];
      }
      return lista;
    },
  };
}
