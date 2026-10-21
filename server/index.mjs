// Servidor de la web en el servidor de Bolas: el juego es estático, así que solo sirve dist.
// Variables: PORT (3000 en el contenedor), ESCUCHAR, WEB_DIR.
import { createServer } from 'node:http';
import { WEB_DIR, estatico } from './estaticos.mjs';

if (!WEB_DIR) throw new Error('Falta WEB_DIR');
createServer(estatico).listen(Number(process.env.PORT) || 3000, process.env.ESCUCHAR || '127.0.0.1', function () {
  console.log(`Bolas Crush en ${process.env.ESCUCHAR || '127.0.0.1'}:${this.address().port}`);
});
