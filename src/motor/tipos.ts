// Contrato del motor: lo comparten el motor (reglas puras), los niveles (datos) y el render (PixiJS).
// El motor no sabe nada de gráficos: cada jugada devuelve una lista de Pasos que el render anima en orden.

/** Índice de sabor 0..5 (ver datos/sabores.ts). */
export type Sabor = number;

/**
 * Lo que lleva una bola además de su sabor. Como Candy Crush: 4 en línea → raya, L/T → tarrina, 5 → bola Bolas,
 * cuadrado 2x2 → sacabolas (quita la cruz de alrededor y vuela a una casilla del objetivo).
 */
export type Especial = 'ninguno' | 'rayaH' | 'rayaV' | 'tarrina' | 'bolaBolas' | 'sacabolas';

export interface Ficha {
  /** Único durante toda la partida: el render lo usa para seguir cada sprite. */
  id: number;
  tipo: 'bola' | 'carapina';
  /** -1 en la bola Bolas (no tiene sabor) y en las carapinas. */
  sabor: Sabor;
  especial: Especial;
}

export interface Celda {
  /** false = hueco del tablero (forma irregular). */
  existe: boolean;
  ficha: Ficha | null;
  /** Capas de mancha en el mostrador debajo de la ficha (la «gelatina»). Se quita una al eliminar la ficha de encima. */
  mancha: 0 | 1 | 2;
  /** Capas de escarcha del congelador: ocupa la celda (sin ficha), no cae; se rompe con un match al lado o una explosión. */
  escarcha: 0 | 1 | 2;
  /** Candado: la ficha no se mueve ni cae; un match que la incluya abre el candado (y no elimina la ficha). */
  candado: boolean;
  /** En esta celda las carapinas «salen» del tablero (fila de abajo de cada columna con carapinas). */
  salida: boolean;
  /** Pala de helado (dispensador de carapinas): bloque fijo sin ficha; cada match al lado o explosión la llena un poco
   *  (0..PALA_MAX) y al llenarse suelta una carapina en una casilla vecina. undefined = no hay pala. */
  pala?: number;
}

export type Pos = { f: number; c: number };

export type Objetivo =
  | { tipo: 'puntos' }
  | { tipo: 'manchas' }                                  // limpiar todas las manchas
  | { tipo: 'carapinas'; n: number }                    // bajar n carapinas hasta la salida
  | { tipo: 'pedido'; pedido: { sabor: Sabor; n: number }[] }; // eliminar n bolas de cada sabor

/**
 * Nivel tal como se escribe en datos/niveles.ts.
 * `forma`: una cadena por fila, mismo largo, un carácter por celda:
 *   '.' hueco · 'o' celda normal · 'm' mancha 1 · 'M' mancha 2 · 'e' escarcha 1 · 'E' escarcha 2
 *   'k' candado · 'K' candado + mancha 1 · 'c' carapina inicial · 's' celda normal que es salida de carapinas
 *   'p' pala de helado (dispensador de carapinas)
 */
export interface Nivel {
  id: number;
  nombre: string;
  forma: string[];
  /** Cuántos sabores salen (4-6). Menos sabores = más fácil. */
  sabores: number;
  movimientos: number;
  objetivo: Objetivo;
  /** Puntos para 1, 2 y 3 estrellas. Ganar exige además cumplir el objetivo. */
  estrellas: [number, number, number];
  /** Carapinas que irán entrando por arriba durante el nivel (objetivo carapinas), además de las 'c' iniciales. */
  carapinasPorSalir?: number;
  semilla: number;
  /** Quién presenta el nivel y qué dice (datos/equipo.ts). */
  presenta?: { quien: string; texto: string };
}

/** Movimiento de una ficha durante la caída o el barajado. `desde.f` puede ser negativo: entra por arriba. */
export type Movimiento = { id: number; desde: Pos; hasta: Pos };

/** Lo que pasa, en orden, para que el render lo anime. */
export type Paso =
  | { tipo: 'intercambio'; a: Pos; b: Pos }
  | { tipo: 'invalido'; a: Pos; b: Pos }                                   // va y vuelve
  | { tipo: 'eliminar'; celdas: Pos[]; ids: number[]; puntos: number; cascada: number; sabor: Sabor }
  | { tipo: 'crearEspecial'; pos: Pos; ficha: Ficha }
  | { tipo: 'detonar'; pos: Pos; especial: Especial; combo?: Especial; celdas: Pos[] } // raya, explosión, rayos de la bola Bolas
  | { tipo: 'mancha'; pos: Pos; quedan: number }
  | { tipo: 'escarcha'; pos: Pos; quedan: number }
  | { tipo: 'candado'; pos: Pos }                                          // se abre
  | { tipo: 'carapinaFuera'; pos: Pos; id: number }
  | { tipo: 'vuelo'; desde: Pos; hasta: Pos; carga: Especial }             // el sacabolas vuela a `hasta` (con la raya o tarrina del combo)
  | { tipo: 'pala'; pos: Pos; carga: number; max: number; suelta?: { ficha: Ficha; hasta: Pos; quitaId?: number } } // se llena; al llenarse suelta una carapina
  | { tipo: 'caer'; movimientos: Movimiento[]; nuevas: { ficha: Ficha; hasta: Pos }[] }
  | { tipo: 'barajar'; movimientos: Movimiento[] }
  | { tipo: 'jaleo'; nivel: 1 | 2 | 3 | 4 }                                // «¡Ole!», «¡Qué arte!»… según la cascada
  | { tipo: 'bolazo' }                                                      // fin del nivel ganado: los movimientos sobrantes se vuelven rayas
  | { tipo: 'fin'; estado: 'ganado' | 'perdido'; estrellas: 0 | 1 | 2 | 3 };

export type EstadoPartida = 'jugando' | 'ganado' | 'perdido';
