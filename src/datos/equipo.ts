// El equipo de la tienda: presentan niveles y reaccionan al ganar o perder.
export interface Personaje {
  id: string;
  nombre: string;
  rol: string;
  color: string;
  frasesGanar: string[];
  frasesPerder: string[];
  porConfirmar?: true;
}

export const EQUIPO: Personaje[] = [
  {
    id: 'rocio', nombre: 'Rocío', rol: 'Maestra heladera y gerente. Te explica cada mecánica nueva.', color: '#E8344E',
    frasesGanar: ['¡Mu bien, mi arma! Así se hace.', '¡Qué arte tienes, criatura!', 'Perfecto. Ya lo vas cogiendo.', '¡Ole! Pa\'lante con el siguiente.'],
    frasesPerder: ['No pasa ná, mi arma. Otra vez.', 'Tranquilo, que esto se aprende.', 'Respira y mira el tablero con calma.', 'Casi, casi. ¡Venga, otra!'],
  },
  {
    id: 'marcos', nombre: 'Marcos', rol: 'Jefe de operaciones. Presenta los pedidos y las carapinas.', color: '#2F6FDE',
    frasesGanar: ['Pedido servido. Buen trabajo.', 'Eso es eficiencia, quillo.', 'Cumplido y a tiempo. ¡Pa\'lante!', 'Así da gusto trabajar contigo.'],
    frasesPerder: ['No ha salido el pedido. A repasar.', 'Hay que organizarse mejor, quillo.', 'Otra vez, que esto se saca.', 'Sin prisa, pero sin pausa.'],
  },
  {
    id: 'chema', nombre: 'Chema', rol: 'Permisivo y alegre. Solo se agobia con lo grave.', color: '#F5A623',
    frasesGanar: ['¡Illo, qué bien! ¡Fiesta!', '¡Esto es la gloria bendita!', '¡Ozú, qué arte, mi arma!', 'Si es que lo bordas, quillo.'],
    frasesPerder: ['Bah, no pasa ná, illo.', 'Es solo un helao, ¡a otra!', 'Tranqui, que mañana sale el sol.', 'Ni se ha enterao nadie, mi arma.'],
  },
  {
    id: 'pablo', nombre: 'Pablo', rol: 'Exigente: se fija en cualquier detalle.', color: '#3C3C4A',
    frasesGanar: ['Aprobado. Pero se puede mejorar.', 'Bien. Sin florituras, pero bien.', 'Correcto. Que no se te suba.', 'Esta vez, limpio. Sigue así.'],
    frasesPerder: ['Esto no vale, quillo.', 'Un detalle más y lo sacas. Repite.', 'Así no, illo. Con cabeza.', 'Me esperaba más de ti.'],
  },
  {
    id: 'fanny', nombre: 'Fanny', rol: 'Trabaja en tienda. Trae los pedidos de los clientes. (por confirmar)', color: '#9B59B6',
    frasesGanar: ['¡La clienta contentísima, mi arma!', '¡Ole! Pedido listo.', 'Qué arte, ya vuelven mañana.', '¡Pa\'lante con el siguiente!'],
    frasesPerder: ['Uy, la clienta se ha ido sin ná.', 'Ozú, otra vez que hay cola.', 'No pasa ná, illo, lo preparamos de nuevo.', 'Venga, que ya viene otro cliente.'],
    porConfirmar: true,
  },
];

export const PERSONAJE: Record<string, Personaje> = Object.fromEntries(EQUIPO.map((p) => [p.id, p]));
