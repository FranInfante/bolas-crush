// Calibra niveles con un bot voraz: node scripts/calibrar.ts [--n=200] [--nivel=3] [--auto] [--escribir]
//  sin --auto: mide los niveles tal cual están en src/datos/niveles.ts
//  --auto: busca los movimientos mínimos que dan la tasa objetivo y fija estrellas (2ª = p60, 3ª = p90)
//  --escribir: reescribe movimientos y estrellas en niveles.ts (con --auto)
import { readFileSync, writeFileSync } from 'node:fs';
import { Partida, crearAzar } from '../src/motor/index.ts';
import type { Nivel, Pos } from '../src/motor/index.ts';
import { EPISODIO_1 } from '../src/datos/niveles.ts';

const arg = (k: string, d?: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const N = Number(arg('n', '200'));
const SOLO = arg('nivel') ? Number(arg('nivel')) : 0;
const AUTO = process.argv.includes('--auto');
const ESCRIBIR = process.argv.includes('--escribir');
const OBJETIVO_TASA = (id: number) => (id <= 3 ? 0.96 : id <= 10 ? 0.84 : id <= 14 ? 0.66 : 0.45);

/** Copia de la Partida (el azar de la copia es otro: el bot no ve el futuro). */
function copiar(p: Partida): Partida {
  const c = Object.create(Object.getPrototypeOf(p)) as any;
  const o = p as any;
  for (const k of ['nivel', 'filas', 'cols', 'barajarAuto', 'puntos', 'movimientosRestantes', 'estado', 'siguienteId', 'salidas', 'porEntrar']) c[k] = o[k];
  for (const k of ['tablero', 'pedidoRestante', 'pendientes', 'ctx']) c[k] = structuredClone(o[k]);
  c.generador = null;
  c.azar = crearAzar((Math.random() * 2 ** 31) | 0);
  return c;
}

/** Cuánto falta del objetivo (menos = mejor). */
function falta(p: Partida, n: Nivel): number {
  const pr = p.progreso, t = n.objetivo.tipo;
  if (t === 'manchas') return pr.manchas;
  if (t === 'carapinas') { // faltan menos y, a igualdad, las carapinas más cerca de la salida
    let prof = 0;
    (p as any).tablero.forEach((fila: any[], f: number) => fila.forEach((ce) => { if (ce.ficha?.tipo === 'carapina') prof += f; }));
    return pr.carapinas * 1000 - prof;
  }
  if (t === 'pedido') return pr.pedido.reduce((s, x) => s + Math.max(0, x.n), 0);
  return 0;
}

function jugadas(p: Partida): [Pos, Pos][] {
  const o = p as any, r: [Pos, Pos][] = [];
  for (let f = 0; f < o.filas; f++) for (let c = 0; c < o.cols; c++) {
    const a = { f, c };
    for (const b of [{ f, c: c + 1 }, { f: f + 1, c }]) if (o.valido(a, b)) r.push([a, b]);
  }
  return r;
}

function jugar(n: Nivel): { gano: boolean; puntos: number } {
  const p = new Partida(n);
  p.asegurarJugada();
  while (p.estado === 'jugando') {
    let mejor: [Pos, Pos] | null = null, mf = Infinity, mp = -1;
    for (const [a, b] of jugadas(p)) {
      const q = copiar(p);
      q.intercambiar(a, b);
      const f = falta(q, n);
      if (f < mf || (f === mf && q.puntos > mp)) { mf = f; mp = q.puntos; mejor = [a, b]; }
    }
    if (!mejor) break;
    p.intercambiar(mejor[0], mejor[1]);
  }
  return { gano: p.estado === 'ganado', puntos: p.puntos };
}

const pct = (v: number[], q: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0; };
const r100 = (x: number) => Math.max(100, Math.round(x / 100) * 100);

interface Medida { tasaObj: number; pts: number[] }
/** Juega n partidas. Puntos: se juegan todos los movimientos (estrella 1 inalcanzable) y se mide la distribución. Resto: estrella 1 = 1. */
function medir(base: Nivel, movs: number, partidas: number): Medida {
  let ok = 0; const pts: number[] = [];
  for (let i = 0; i < partidas; i++) {
    const puntos = base.objetivo.tipo === 'puntos';
    const n: Nivel = { ...base, movimientos: movs, semilla: base.semilla * 1000 + i, estrellas: puntos ? [1e12, 2e12, 3e12] : [1, 2, 3] };
    const r = jugar(n);
    pts.push(r.puntos);
    if (puntos || r.gano) ok++;
  }
  return { tasaObj: ok / partidas, pts };
}

const filas: string[] = [];
const cambios: { id: number; mov: number; est: [number, number, number] }[] = [];
for (const base of EPISODIO_1.niveles) {
  if (SOLO && base.id !== SOLO) continue;
  const t0 = Date.now();
  const meta = OBJETIVO_TASA(base.id);
  const puntos = base.objetivo.tipo === 'puntos';
  let mov = base.movimientos, m: Medida;
  if (AUTO && !puntos) {
    // Movimientos mínimos (pasos de 1) con tasa de objetivo ≥ meta/0.97 (la estrella 1 se fija en p3 de los que ganan).
    mov = 8;
    for (;; mov++) { if (medir(base, mov, 50).tasaObj >= meta / 0.97 + 0.02 || mov >= 60) break; }
  }
  m = medir(base, mov, N);
  let est = base.estrellas;
  if (AUTO) {
    const ganadoras = puntos ? m.pts : m.pts.filter(() => true);
    const e0 = r100(puntos ? pct(m.pts, 1 - meta) * 0.98 : Math.min(pct(ganadoras, 0.03), pct(ganadoras, 0.4)));
    const e1 = Math.max(r100(pct(m.pts, 0.6)), e0 + 100), e2 = Math.max(r100(pct(m.pts, 0.9)), e1 + 100);
    est = [e0, e1, e2];
  }
  // Tasa real de victoria con esas estrellas (objetivo cumplido y puntos ≥ estrella 1).
  const vic = puntos ? m.pts.filter((x) => x >= est[0]).length / m.pts.length : m.tasaObj * (m.pts.filter((x) => x >= est[0]).length / m.pts.length);
  filas.push(`${String(base.id).padStart(2)} | ${String(mov).padStart(3)} | ${est.join(' / ')} | ${(vic * 100).toFixed(0)}% | p10 ${pct(m.pts, 0.1)} p50 ${pct(m.pts, 0.5)} p90 ${pct(m.pts, 0.9)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log(filas[filas.length - 1]);
  cambios.push({ id: base.id, mov, est });
}

if (AUTO && ESCRIBIR) {
  const ruta = new URL('../src/datos/niveles.ts', import.meta.url);
  let src = readFileSync(ruta, 'utf8');
  for (const c of cambios) {
    src = src.replace(new RegExp(`(id: ${c.id}, nombre: '[^']*', sabores: \d, movimientos: )\d+`), (_m, a) => `${a}${c.mov}`);
    src = src.replace(new RegExp(`(id: ${c.id},[^\n]*?(?:\n[^\n]*?)?)estrellas: (?:est\(\d+\)|\[[^\]]*\])`), (_m, a) => `${a}estrellas: [${c.est.join(', ')}]`);
  }
  writeFileSync(ruta, src);
  console.log('niveles.ts actualizado');
}
