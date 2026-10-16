// Jaleo según la cascada, y textos de pantalla.
export const JALEO: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['¡Ole!', '¡Olé tú!', '¡Bien, illo!'],
  2: ['¡Qué arte!', '¡Eso es arte, mi arma!', '¡Mu bien!'],
  3: ['¡Esto es de categoría!', '¡Categoría pura!', '¡Qué barbaridad de bien!'],
  4: ['¡Ozú, qué bolazo!', '¡Ozú, esto es la gloria!', '¡Qué locura, quillo!'],
};

export const BOLAZO = '¡BOLAZO!';

export const TEXTOS = {
  titulo: 'Bolas Crush',
  jugar: 'Jugar',
  siguiente: 'Siguiente',
  repetir: 'Repetir',
  volver: 'Volver al mapa',
  nivelSuperado: '¡Nivel superado!',
  nivelFallido: 'Nivel no superado',
  sinMovimientos: 'Te has quedado sin movimientos, mi arma',
  movimientos: 'Movimientos',
  puntos: 'Puntos',
  objetivo: 'Objetivo',
  estrellas: 'Estrellas',
  sinJugadas: 'No quedan jugadas: ¡barajamos!',
  objetivoPuntos: (n: number) => `Consigue ${n.toLocaleString('es-ES')} puntos`,
  objetivoManchas: 'Limpia todas las manchas del mostrador',
  objetivoCarapinas: (n: number) => `Baja ${n} carapina${n === 1 ? '' : 's'} al congelador`,
  objetivoPedido: 'Sirve el pedido de la clienta',
} as const;
