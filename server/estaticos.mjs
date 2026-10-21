// La web estática (dist), copiada de overcooked: en el contenedor del servidor
// de Bolas (WEB_DIR=/app/dist).
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};
// Lo que tiene que llegar siempre fresco para que el juego se actualice solo.
const SIN_CACHE = /(^|\/)(sw\.js|version\.json|[^/]+\.html)$/;

export const WEB_DIR = process.env.WEB_DIR;

export async function estatico(req, res) {
  let ruta;
  try { ruta = decodeURIComponent(String(req.url).split('?')[0]); } catch { ruta = '/'; }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const base = normalize(WEB_DIR);
  const fichero = join(base, normalize(ruta)); // normalize de una ruta que empieza por / no sube de la raíz
  if (!fichero.startsWith(base + sep)) { res.statusCode = 404; return res.end(); }
  try {
    const datos = await readFile(fichero);
    res.setHeader('Content-Type', TIPOS[extname(fichero)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', SIN_CACHE.test(ruta) ? 'no-cache' : ruta.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch {
    res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('No existe');
  }
}
