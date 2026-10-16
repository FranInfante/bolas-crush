// Sabores-ficha: el índice en este array es el `Sabor` del motor (0..5).
// Descripciones sacadas de la carta real de Bolas.
export interface SaborFicha {
  id: string;
  nombre: string;
  color: string;
  colorClaro: string;
  colorOscuro: string;
  descripcion: string;
  porConfirmar?: true;
}

export const SABORES: SaborFicha[] = [
  { id: 'fresa', nombre: 'Fresa', color: '#E8344E', colorClaro: '#FF7A8C', colorOscuro: '#A81B30', descripcion: 'Sorbete de fresa, vegano.' },
  { id: 'mango', nombre: 'Mango', color: '#FF8A1F', colorClaro: '#FFB866', colorOscuro: '#C25E00', descripcion: 'Sorbete de mango, vegano.' },
  { id: 'limon', nombre: 'Limón', color: '#FFD92E', colorClaro: '#FFEE85', colorOscuro: '#C9A200', descripcion: 'Sorbete de limón, vegano.' },
  { id: 'pistacho', nombre: 'Pistacho', color: '#5BBF3B', colorClaro: '#9BE07F', colorOscuro: '#378A1E', descripcion: 'Crema de pistacho.' },
  { id: 'chocolate', nombre: 'Chocolate Belga', color: '#7A4A2B', colorClaro: '#B07650', colorOscuro: '#4A2A14', descripcion: 'Chocolate negro con trozos de chocolate.' },
  // En la carta hay «Frutos del Bosque» (sorbete) pero no un sabor «Mora» suelto.
  { id: 'mora', nombre: 'Mora', color: '#7B3FB5', colorClaro: '#B07BE0', colorOscuro: '#4F2080', descripcion: 'Frutos del bosque, sorbete vegano.', porConfirmar: true },
];
