import type { Nivel } from '../motor/tipos.ts';

// Sabores por índice: 0 Fresa, 1 Mango, 2 Limón, 3 Pistacho, 4 Chocolate Belga, 5 Mora.
// Estrellas: 1ª ≈ 1100-1400 puntos por movimiento, 2ª ×1.5, 3ª ×2.
const est = (a: number): [number, number, number] => [a, a * 1.5, a * 2];

export const EPISODIO_1: { nombre: string; tienda: string; niveles: Nivel[] } = {
  nombre: 'Herbolarios',
  tienda: 'C/ Herbolarios 20',
  niveles: [
    {
      id: 1, nombre: 'Primera bola', sabores: 4, movimientos: 20, semilla: 101, objetivo: { tipo: 'puntos' }, estrellas: est(22000),
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Junta tres bolas del mismo sabor, mi arma. Deslizas una y ya está.' },
    },
    {
      id: 2, nombre: 'Rayas de sabor', sabores: 4, movimientos: 20, semilla: 102, objetivo: { tipo: 'puntos' }, estrellas: est(22000),
      forma: ['....o....', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '....o....'],
      presenta: { quien: 'rocio', texto: 'Si juntas cuatro, te sale una bola con raya: ¡limpia una fila entera!' },
    },
    {
      id: 3, nombre: 'Tarrina y bola Bolas', sabores: 5, movimientos: 22, semilla: 103, objetivo: { tipo: 'puntos' }, estrellas: est(25000),
      forma: ['ooo...ooo', 'ooo...ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.'],
      presenta: { quien: 'rocio', texto: 'Con una L o una T sale la tarrina, que explota. Y con cinco en línea, ¡la bola Bolas!' },
    },
    {
      id: 4, nombre: 'Manchas en el mostrador', sabores: 5, movimientos: 22, semilla: 104, objetivo: { tipo: 'manchas' }, estrellas: est(26000),
      forma: ['..ooooo..', '.ooooooo.', 'oommmmmoo', 'oommmmmoo', 'oommmmmoo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'rocio', texto: 'Mira qué mostrador. Para limpiar la mancha, elimina la bola que tiene encima.' },
    },
    {
      id: 5, nombre: 'Mostrador de rayas', sabores: 5, movimientos: 28, semilla: 105, objetivo: { tipo: 'manchas' }, estrellas: est(34000),
      forma: ['ooo...ooo', 'mmooooomm', 'mmmmmmmmm', 'ooommmooo', 'mmmmmmmmm', 'mmooooomm', '.ooooooo.', '..ooooo..'],
    },
    {
      id: 6, nombre: 'Doble capa', sabores: 5, movimientos: 30, semilla: 106, objetivo: { tipo: 'manchas' }, estrellas: est(38000),
      forma: ['.ooooooo.', 'ooommmooo', 'oommMmmoo', 'ommMMMmmo', 'oommMmmoo', 'ooommmooo', '.ooooooo.'],
    },
    {
      id: 7, nombre: 'Pedido de Fanny', sabores: 5, movimientos: 25, semilla: 107,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 16 }, { sabor: 3, n: 16 }] }, estrellas: est(30000),
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'fanny', texto: "Illo, hay una clienta que quiere fresa y pistacho: 16 de cada, pa'lante." },
    },
    {
      id: 8, nombre: 'Tres sabores', sabores: 5, movimientos: 26, semilla: 108,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 0, n: 12 }, { sabor: 1, n: 12 }, { sabor: 2, n: 12 }] }, estrellas: est(32000),
      forma: ['ooooooooo', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'marcos', texto: 'Pedido grande para una cena: doce de fresa, doce de mango y doce de limón.' },
    },
    {
      id: 9, nombre: 'Carapinas al congelador', sabores: 5, movimientos: 25, semilla: 109, objetivo: { tipo: 'carapinas', n: 2 }, estrellas: est(30000),
      forma: ['.ooooooo.', 'oocooocoo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', 'oosooosoo'],
      presenta: { quien: 'marcos', texto: 'Las carapinas hay que bajarlas al congelador. Limpia lo que tengan debajo.' },
    },
    {
      id: 10, nombre: 'Lluvia de carapinas', sabores: 5, movimientos: 28, semilla: 110,
      objetivo: { tipo: 'carapinas', n: 4 }, carapinasPorSalir: 2, estrellas: est(34000),
      forma: ['ooooooooo', 'oocooocoo', 'ooooooooo', 'ooo...ooo', 'ooooooooo', 'sssssssss'],
    },
    {
      id: 11, nombre: 'Escarcha', sabores: 5, movimientos: 25, semilla: 111, objetivo: { tipo: 'puntos' }, estrellas: est(30000),
      forma: ['.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'eeoooooee'],
      presenta: { quien: 'pablo', texto: 'Escarcha del congelador. Un match al lado la rompe. Que no se te escape ninguna.' },
    },
    {
      id: 12, nombre: 'Candados', sabores: 5, movimientos: 26, semilla: 112, objetivo: { tipo: 'puntos' }, estrellas: est(32000),
      forma: ['.ooooooo.', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooookoooo', 'ookoookoo', 'ooooooooo', '.ooooooo.'],
      presenta: { quien: 'chema', texto: '¡Illo, que se me han quedao los candaos puestos! Haz un match con la bola y se abre.' },
    },
    {
      id: 13, nombre: 'Manchas y escarcha', sabores: 5, movimientos: 26, semilla: 113, objetivo: { tipo: 'manchas' }, estrellas: est(32000),
      forma: ['..ooooo..', '.ooooooo.', 'ooommmooo', 'oommmmmoo', 'ooommmooo', 'ommoooomm', 'eoooooooe', '.eeeeeee.'],
    },
    {
      id: 14, nombre: 'Pedido de categoría', sabores: 6, movimientos: 28, semilla: 114,
      objetivo: { tipo: 'pedido', pedido: [{ sabor: 1, n: 14 }, { sabor: 4, n: 14 }, { sabor: 5, n: 14 }] }, estrellas: est(36000),
      forma: ['ooo...ooo', 'ooooooooo', 'ookoookoo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'],
      presenta: { quien: 'fanny', texto: 'Mi arma, esta clienta es de las exigentes: mango, chocolate belga y mora, catorce de cada.' },
    },
    {
      id: 15, nombre: 'El gran pedido de Herbolarios', sabores: 6, movimientos: 32, semilla: 115, objetivo: { tipo: 'manchas' }, estrellas: est(44000),
      forma: ['.ooooooo.', 'oMMoooMMo', 'oMMMoMMMo', 'ooMMMMMoo', 'oommMmmoo', 'ooooooooo', 'ooooooooo', 'EEEoooEEE'],
      presenta: { quien: 'pablo', texto: 'Inspección de fin de episodio. Mostrador doble y escarcha gorda. Sin excusas.' },
    },
  ],
};
