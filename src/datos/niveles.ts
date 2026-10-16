import type { Nivel } from '../motor/tipos.ts';

// Calibrado con scripts/calibrar.ts (bot voraz, 200 partidas por nivel; nivel 15 oscila 43-53 % según la tirada).
// Nivel | movimientos | estrellas | % victoria del bot
//   1 | 20 | 156300 / 310600 / 432700 | 95%
//   2 | 20 | 62400 / 133900 / 180000 | 94%
//   3 | 22 | 27500 / 54800 / 76600 | 96%
//   4 | 11 | 20600 / 28000 / 35400 | 95%
//   5 | 25 | 43500 / 62300 / 78300 | 89%
//   6 | 12 | 36600 / 47900 / 57600 | 88%
//   7 | 12 | 9200 / 17400 / 24500 | 86%
//   8 | 14 | 6300 / 12000 / 17300 | 93%
//   9 | 39 | 30200 / 49400 / 75600 | 85%
//  10 | 60 | 39700 / 56400 / 65500 | 83%
//  11 | 25 | 41700 / 52500 / 73800 | 73%
//  12 | 26 | 51500 / 67300 / 90500 | 63%
//  13 | 10 | 20700 / 31900 / 43000 | 64%
//  14 | 20 | 5900 / 12200 / 16400 | 73%
//  15 | 19 | 39900 / 52900 / 60900 | 53%
// Ojo: el bot juega mucho mejor que una persona (cascadas enormes): los puntos de los niveles de puntos son altos.
// Sabores por índice: 0 Fresa, 1 Mango, 2 Limón, 3 Pistacho, 4 Chocolate Belga, 5 Mora.

export const EPISODIO_1: { nombre: string; tienda: string; niveles: Nivel[] } = {
  nombre: 'Herbolarios',
  tienda: 'C/ Herbolarios 20',
  niveles: [
    {
      id: 1, nombre: 'Primera bola', sabores: 4, movimientos: 20, semilla: 101, objetivo: { tipo: 'puntos' }, estrellas: [156300, 310600, 432700],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Junta tres bolas del mismo sabor, mi arma. Deslizas una y ya está.' },
    },
    {
      id: 2, nombre: 'Rayas de sabor', sabores: 4, movimientos: 20, semilla: 102, objetivo: { tipo: 'puntos' }, estrellas: [62400, 133900, 180000],
      forma: ['....o....', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '....o....'],
      presenta: { quien: 'rocio', texto: 'Si juntas cuatro, te sale una bola con raya: ¡limpia una fila entera!' },
    },
    {
      id: 3, nombre: 'Tarrina y bola Bolas', sabores: 5, movimientos: 22, semilla: 103, objetivo: { tipo: 'puntos' }, estrellas: [27500, 54800, 76600],
      forma: ['ooo...ooo', 'ooo...ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Con una L o una T sale la tarrina, que explota. Y con cinco en línea, ¡la bola Bolas!' },
    },
    {
      id: 4, nombre: 'Manchas en el mostrador', sabores: 5, movimientos: 11, semilla: 104, objetivo: { tipo: 'manchas' }, estrellas: [20600, 28000, 35400],
      forma: ['..ooooo..', '.ooooooo.', 'oommmmmoo', 'oommmmmoo', 'oommmmmoo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'rocio', texto: 'Mira qué mostrador. Para limpiar la mancha, elimina la bola que tiene encima.' },
    },
    {
      id: 5, nombre: 'Mostrador de rayas', sabores: 5, movimientos: 25, semilla: 105, objetivo: { tipo: 'manchas' }, estrellas: [43500, 62300, 78300],
      forma: ['ooo...ooo', 'mmooooomm', 'mmmmmmmmm', 'ooommmooo', 'mmmmmmmmm', 'mmooooomm', '.ooooooo.', '..ooooo..'],
    },
    {
      id: 6, nombre: 'Doble capa', sabores: 5, movimientos: 12, semilla: 106, objetivo: { tipo: 'manchas' }, estrellas: [36600, 47900, 57600],
      forma: ['.ooooooo.', 'ooommmooo', 'oommMmmoo', 'ommMMMmmo', 'oommMmmoo', 'ooommmooo', '.ooooooo.'],
    },
    {
      id: 7, nombre: 'Pedido de Fanny', sabores: 5, movimientos: 12, semilla: 107,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 16 }, { sabor: 3, n: 16 }] }, estrellas: [9200, 17400, 24500],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'fanny', texto: "Illo, hay una clienta que quiere fresa y pistacho: 16 de cada, pa'lante." },
    },
    {
      id: 8, nombre: 'Tres sabores', sabores: 5, movimientos: 14, semilla: 108,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 12 }, { sabor: 1, n: 12 }, { sabor: 2, n: 12 }] }, estrellas: [6300, 12000, 17300],
      forma: ['ooooooooo', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'marcos', texto: 'Pedido grande para una cena: doce de fresa, doce de mango y doce de limón.' },
    },
    {
      id: 9, nombre: 'Carapinas al congelador', sabores: 5, movimientos: 39, semilla: 109, objetivo: { tipo: 'carapinas', n: 2 }, estrellas: [30200, 49400, 75600],
      forma: ['.ooooooo.', 'oocooocoo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', 'oosooosoo'],
      presenta: { quien: 'marcos', texto: 'Las carapinas hay que bajarlas al congelador. Limpia lo que tengan debajo.' },
    },
    {
      id: 10, nombre: 'Lluvia de carapinas', sabores: 5, movimientos: 60, semilla: 110,
      objetivo: { tipo: 'carapinas', n: 3 }, carapinasPorSalir: 1, estrellas: [39700, 56400, 65500],
      forma: ['ooooooooo', 'oocooocoo', 'ooooooooo', 'ooo...ooo', 'ooooooooo', 'sssssssss'],
    },
    {
      id: 11, nombre: 'Escarcha', sabores: 5, movimientos: 25, semilla: 111, objetivo: { tipo: 'puntos' }, estrellas: [41700, 52500, 73800],
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'eeoooooee'],
      presenta: { quien: 'pablo', texto: 'Escarcha del congelador. Un match al lado la rompe. Que no se te escape ninguna.' },
    },
    {
      id: 12, nombre: 'Candados', sabores: 5, movimientos: 26, semilla: 112, objetivo: { tipo: 'puntos' }, estrellas: [51500, 67300, 90500],
      forma: ['.ooooooo.', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooookoooo', 'ookoookoo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'chema', texto: '¡Illo, que se me han quedao los candaos puestos! Haz un match con la bola y se abre.' },
    },
    {
      id: 13, nombre: 'Manchas y escarcha', sabores: 5, movimientos: 10, semilla: 113, objetivo: { tipo: 'manchas' }, estrellas: [20700, 31900, 43000],
      forma: ['..ooooo..', '.ooooooo.', 'ooommmooo', 'oommmmmoo', 'ooommmooo', 'ommoooomm', 'eoooooooe', '.eeeeeee.'],
    },
    {
      id: 14, nombre: 'Pedido de categoría', sabores: 6, movimientos: 20, semilla: 114,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 1, n: 14 }, { sabor: 4, n: 14 }, { sabor: 5, n: 14 }] }, estrellas: [5900, 12200, 16400],
      forma: ['ooo...ooo', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'fanny', texto: 'Mi arma, esta clienta es de las exigentes: mango, chocolate belga y mora, catorce de cada.' },
    },
    {
      id: 15, nombre: 'El gran pedido de Herbolarios', sabores: 6, movimientos: 19, semilla: 115, objetivo: { tipo: 'manchas' }, estrellas: [39900, 52900, 60900],
      forma: ['.ooooooo.', 'oMMoooMMo', 'oMMMoMMMo', 'ooMMMMMoo', 'oommMmmoo', 'ooooooooo', 'ooooooooo', 'EEEoooEEE'],
      presenta: { quien: 'pablo', texto: 'Inspección de fin de episodio. Mostrador doble y escarcha gorda. Sin excusas.' },
    },
  ],
};
