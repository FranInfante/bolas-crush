import type { Nivel } from '../motor/tipos.ts';

// Calibrado con scripts/calibrar.ts (bot voraz con 3 clones de azar por jugada, 200 partidas por nivel; movimientos 15-35).
// Nivel | movimientos | estrellas | % victoria bot | p50 puntos
//   1 | 20 | 167700 / 361700 / 505500 | 96% | 335600
//   2 | 20 | 72100 / 141000 / 187000 | 97% | 129700
//   3 | 22 | 31100 / 62300 / 87600 | 97% | 55080
//   4 | 15 | 28700 / 37300 / 47700 | 89% | 36360
//   5 | 24 | 43800 / 60900 / 73000 | 90% | 58260
//   6 | 17 | 48200 / 58100 / 68100 | 89% | 56380
//   7 | 15 | 12500 / 20800 / 28200 | 95% | 19820
//   8 | 16 | 8000 / 14200 / 20000 | 91% | 13400
//   9 | 26 | 25200 / 38900 / 50900 | 82% | 37200
//  10 | 31 | 34200 / 42500 / 48200 | 87% | 41400
//  11 | 25 | 48400 / 60300 / 85100 | 69% | 55540
//  12 | 26 | 59300 / 74400 / 101000 | 67% | 67960
//  13 | 15 | 32900 / 46500 / 55900 | 86% | 43560
//  14 | 18 | 6100 / 11900 / 15900 | 62% | 10780
//  15 | 17 | 39900 / 50700 / 58400 | 43% | 49160
// Sabores por índice: 0 Fresa, 1 Mango, 2 Limón, 3 Pistacho, 4 Chocolate Belga, 5 Mora.

// Niveles de puntos (1-3, 11, 12): 1ª estrella = p15 de un jugador que mueve al azar (la saca casi cualquiera; en 1-3, tutorial, la mitad),
// 2ª = media entre el p50 al azar y el p50 del bot, 3ª = p60 del bot. Ajustado tras la tabla de arriba.

export const EPISODIO_1: { nombre: string; tienda: string; niveles: Nivel[] } = {
  nombre: 'Herbolarios',
  tienda: 'C/ Herbolarios 20',
  niveles: [
    {
      id: 1, nombre: 'Primera bola', sabores: 4, movimientos: 20, semilla: 101, objetivo: { tipo: 'puntos' }, estrellas: [12000, 206000, 361700],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Junta tres bolas del mismo sabor, mi arma. Deslizas una y ya está.' },
    },
    {
      id: 2, nombre: 'Rayas de sabor', sabores: 4, movimientos: 20, semilla: 102, objetivo: { tipo: 'puntos' }, estrellas: [12000, 85000, 141000],
      forma: ['....o....', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '....o....'],
      presenta: { quien: 'rocio', texto: 'Si juntas cuatro, te sale una bola con raya: ¡limpia una fila entera!' },
    },
    {
      id: 3, nombre: 'Tarrina y bola Bolas', sabores: 5, movimientos: 22, semilla: 103, objetivo: { tipo: 'puntos' }, estrellas: [6000, 36600, 62300],
      forma: ['ooo...ooo', 'ooo...ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Con una L o una T sale la tarrina, que explota. Y con cinco en línea, ¡la bola Bolas!' },
    },
    {
      id: 4, nombre: 'Manchas en el mostrador', sabores: 5, movimientos: 15, semilla: 104, objetivo: { tipo: 'manchas' }, estrellas: [28700, 37300, 47700],
      forma: ['..ooooo..', '.ooooooo.', 'ommmmmmmo', 'ommmmmmmo', 'ommmmmmmo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'rocio', texto: 'Mira qué mostrador. Para limpiar la mancha, elimina la bola que tiene encima.' },
    },
    {
      id: 5, nombre: 'Mostrador de rayas', sabores: 5, movimientos: 24, semilla: 105, objetivo: { tipo: 'manchas' }, estrellas: [43800, 60900, 73000],
      forma: ['ooo...ooo', 'mmooooomm', 'mmmmmmmmm', 'ooommmooo', 'mmmmmmmmm', 'mmooooomm', '.ooooooo.', '..ooooo..'],
    },
    {
      id: 6, nombre: 'Doble capa', sabores: 5, movimientos: 17, semilla: 106, objetivo: { tipo: 'manchas' }, estrellas: [48200, 58100, 68100],
      forma: ['.mmmmmmm.', 'ooommmooo', 'oommMmmoo', 'ommMMMmmo', 'oommMmmoo', 'ooommmooo', '.ooooooo.'],
    },
    {
      id: 7, nombre: 'Pedido de Fanny', sabores: 5, movimientos: 15, semilla: 107,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 20 }, { sabor: 3, n: 20 }] }, estrellas: [12500, 20800, 28200],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'fanny', texto: "Illo, hay una clienta que quiere fresa y pistacho: 16 de cada, pa'lante." },
    },
    {
      id: 8, nombre: 'Tres sabores', sabores: 5, movimientos: 16, semilla: 108,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 15 }, { sabor: 1, n: 15 }, { sabor: 2, n: 15 }] }, estrellas: [8000, 14200, 20000],
      forma: ['ooooooooo', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'marcos', texto: 'Pedido grande para una cena: doce de fresa, doce de mango y doce de limón.' },
    },
    {
      id: 9, nombre: 'Carapinas al congelador', sabores: 5, movimientos: 26, semilla: 109, objetivo: { tipo: 'carapinas', n: 2 }, estrellas: [25200, 38900, 50900],
      forma: ['.ooooooo.', 'oocooocoo', 'ooooooooo', 'ooooooooo', '.ooooooo.', 'oosooosoo'],
      presenta: { quien: 'marcos', texto: 'Las carapinas hay que bajarlas al congelador. Limpia lo que tengan debajo.' },
    },
    {
      id: 10, nombre: 'Lluvia de carapinas', sabores: 5, movimientos: 31, semilla: 110,
      objetivo: { tipo: 'carapinas', n: 3 }, carapinasPorSalir: 1, estrellas: [34200, 42500, 48200],
      forma: ['ooooooooo', 'oocooocoo', 'ooooooooo', 'sssssssss'],
    },
    {
      id: 11, nombre: 'Escarcha', sabores: 5, movimientos: 25, semilla: 111, objetivo: { tipo: 'puntos' }, estrellas: [16300, 37700, 60300],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'eeoooooee'],
      presenta: { quien: 'pablo', texto: 'Escarcha del congelador. Un match al lado la rompe. Que no se te escape ninguna.' },
    },
    {
      id: 12, nombre: 'Candados', sabores: 5, movimientos: 26, semilla: 112, objetivo: { tipo: 'puntos' }, estrellas: [11800, 43400, 74400],
      forma: ['.ooooooo.', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooookoooo', 'ookoookoo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'chema', texto: '¡Illo, que se me han quedao los candaos puestos! Haz un match con la bola y se abre.' },
    },
    {
      id: 13, nombre: 'Manchas y escarcha', sabores: 5, movimientos: 15, semilla: 113, objetivo: { tipo: 'manchas' }, estrellas: [32900, 46500, 55900],
      forma: ['..ooooo..', '.ooooooo.', 'ommmmmmmo', 'oommmmmoo', 'ommmmmmmo', 'ommoooomm', 'eoooooooe', '.eeeeeee.'],
    },
    {
      id: 14, nombre: 'Pedido de categoría', sabores: 6, movimientos: 18, semilla: 114,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 1, n: 14 }, { sabor: 4, n: 14 }, { sabor: 5, n: 14 }] }, estrellas: [6100, 11900, 15900],
      forma: ['ooo...ooo', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'fanny', texto: 'Mi arma, esta clienta es de las exigentes: mango, chocolate belga y mora, catorce de cada.' },
    },
    {
      id: 15, nombre: 'El gran pedido de Herbolarios', sabores: 6, movimientos: 17, semilla: 115, objetivo: { tipo: 'manchas' }, estrellas: [39900, 50700, 58400],
      forma: ['.ooooooo.', 'oMMoooMMo', 'oMMMoMMMo', 'ooMMMMMoo', 'oommMmmoo', 'ooooooooo', 'ooooooooo', 'EEEoooEEE'],
      presenta: { quien: 'pablo', texto: 'Inspección de fin de episodio. Mostrador doble y escarcha gorda. Sin excusas.' },
    },
  ],
};
