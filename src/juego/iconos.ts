// Iconos 3D generados con IA (public/arte/iconos/<id>.webp). Si no cargan, quedan los dibujos por código.
import { Assets } from 'pixi.js';
import type { Texture } from 'pixi.js';

const IDS = ['cuchara', 'manoLibre', 'sacabolas', 'mas5'];
const iconos = new Map<string, Texture>();

export async function cargarIconos(): Promise<void> {
  await Promise.all(IDS.map(async (id) => {
    try { iconos.set(id, await Assets.load<Texture>({ src: `${import.meta.env.BASE_URL}arte/iconos/${id}.webp`, data: { resolution: 2 } })); } catch { /* sin icono: dibujo de respaldo */ }
  }));
}

export const iconoTex = (id: string): Texture | undefined => iconos.get(id);
