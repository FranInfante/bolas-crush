import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Partida } from './partida.ts';
import type { Nivel, Paso, Pos } from './tipos.ts';
import { partidaDesde, especial, poner, pos, tipos, de } from './ayudas-test.ts';

const clave = (p: Pos) => `${p.f},${p.c}`;
const conjunto = (ps: Pos[]) => new Set(ps.map(clave));
/** ¿Queda algún trío hecho en el tablero? (las carapinas y la bola Bolas no cuentan) */
function hayTrios(p: Partida): boolean {
  const t = p.tablero;
  const s = (f: number, c: number) => {
    const x = t[f]?.[c]?.ficha;
    return x && x.tipo === 'bola' && x.sabor >= 0 ? x.sabor : -1;
  };
  for (let f = 0; f < t.length; f++) for (let c = 0; c < t[0].length; c++) {
    const v = s(f, c);
    if (v < 0) continue;
    if (s(f, c + 1) === v && s(f, c + 2) === v) return true;
    if (s(f + 1, c) === v && s(f + 2, c) === v) return true;
  }
  return false;
}

// Tableros 5x5 a mano sobre un patrón diagonal sin tríos ni jugadas; los 3 son las bolas de la jugada.
const BASE = ['01201', '12012', '20120', '01201', '12012'];
const TRIO = ['01201', '12312', '23030', '01201', '12012']; // bajar el 3 de (1,2) a (2,2) → trío en la fila 2
const H4 = ['01201', '12312', '33030', '01201', '12012'];
const V4 = ['01301', '12312', '23020', '01301', '12012']; // (2,1)↔(2,2) → 4 en la columna 2
const ELE = ['01301', '12312', '21033', '01301', '12012']; // (2,2)↔(3,2) → L
const CINCO = ['01201', '12312', '33033', '01201', '12012'];

function nuevo(filas: string[], extra: Partial<Nivel> = {}) {
  const p = partidaDesde(filas, extra);
  p.barajarAuto = false; // para poder mirar el tablero tal cual queda tras la jugada
  return p;
}

// ---------------- relleno inicial ----------------
test('relleno inicial: sin tríos, con jugada, solo los sabores del nivel y respetando huecos', () => {
  const forma = ['..ooo..', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', 'ooooooo', 'ooooooo'];
  for (let semilla = 1; semilla <= 40; semilla++) {
    const p = new Partida({ id: 1, nombre: 't', forma, sabores: 4, movimientos: 20, objetivo: { tipo: 'puntos' }, estrellas: [1, 2, 3], semilla });
    assert.equal(hayTrios(p), false, `semilla ${semilla}`);
    assert.notEqual(p.pista(), null, `semilla ${semilla}`);
    p.tablero.forEach((fila, f) => fila.forEach((c, i) => {
      assert.equal(c.existe, forma[f][i] !== '.');
      if (c.existe) assert.ok(c.ficha && c.ficha.sabor >= 0 && c.ficha.sabor < 4);
      else assert.equal(c.ficha, null);
    }));
    const ids = p.tablero.flat().filter((c) => c.ficha).map((c) => c.ficha!.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('la forma se lee entera: mancha, escarcha, candado, carapina inicial y salida', () => {
  const p = new Partida({ id: 1, nombre: 't', forma: ['mMeEk', 'Kcsoo'], sabores: 4, movimientos: 9, objetivo: { tipo: 'puntos' }, estrellas: [1, 2, 3], semilla: 3 });
  const t = p.tablero;
  assert.deepEqual([t[0][0].mancha, t[0][1].mancha, t[1][0].mancha], [1, 2, 1]);
  assert.deepEqual([t[0][2].escarcha, t[0][3].escarcha], [1, 2]);
  assert.equal(t[0][2].ficha, null);
  assert.equal(t[0][4].candado, true);
  assert.equal(t[1][0].candado, true);
  assert.equal(t[1][1].ficha!.tipo, 'carapina');
  assert.equal(t[1][2].salida, true);
  assert.equal(p.movimientosRestantes, 9);
});

// ---------------- swap ----------------
test('swap no adyacente o sin match es inválido y no gasta movimiento', () => {
  const p = nuevo(TRIO);
  assert.deepEqual(tipos(p.intercambiar(pos(0, 0), pos(2, 2))), ['invalido']);
  assert.deepEqual(tipos(p.intercambiar(pos(0, 0), pos(0, 1))), ['invalido']);
  assert.deepEqual(tipos(p.intercambiar(pos(0, 0), pos(-1, 0))), ['invalido']);
  assert.equal(p.movimientosRestantes, 20);
  assert.equal(p.puntos, 0);
});

test('fichas con candado o escarcha no se mueven', () => {
  const p = nuevo(TRIO);
  poner(p, 1, 2, { candado: true });
  assert.deepEqual(tipos(p.intercambiar(pos(1, 2), pos(2, 2))), ['invalido']);
  const q = nuevo(['0123', '4e56']);
  assert.deepEqual(tipos(q.intercambiar(pos(1, 0), pos(1, 1))), ['invalido']);
});

// ---------------- trío, puntos ----------------
test('trío: 60 por bola, orden de pasos y movimiento gastado', () => {
  const p = nuevo(TRIO);
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.deepEqual(tipos(pasos), ['intercambio', 'eliminar', 'caer']);
  const e = de(pasos, 'eliminar')[0];
  assert.equal(e.puntos, 180);
  assert.equal(e.cascada, 1);
  assert.equal(e.sabor, 3);
  assert.deepEqual(conjunto(e.celdas), new Set(['2,1', '2,2', '2,3']));
  assert.equal(p.puntos, 180);
  assert.equal(p.movimientosRestantes, 19);
  assert.equal(hayTrios(p), false);
});

test('los ids de las fichas son estables y las nuevas no repiten', () => {
  const p = nuevo(TRIO);
  const id = p.tablero[0][0].ficha!.id;
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.tablero[0][0].ficha!.id, id);
  const caer = de(pasos, 'caer')[0];
  const ids = [...caer.movimientos.map((m) => m.id), ...caer.nuevas.map((n) => n.ficha.id)];
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(caer.nuevas.every((n) => n.hasta.f >= 0));
});

test('cascada: lo que cae y casa puntúa ×2 y sube el jaleo', () => {
  const p = nuevo(TRIO);
  let n = 0;
  p.generador = () => (n++ < 3 ? 7 : 100 + n); // los tres que entran por la fila 0 hacen trío solos
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  const es = de(pasos, 'eliminar');
  assert.deepEqual(es.slice(0, 2).map((e) => [e.cascada, e.puntos]), [[1, 180], [2, 360]]);
  assert.ok(p.puntos >= 540);
  assert.deepEqual(de(pasos, 'jaleo').map((j) => j.nivel), [1]);
});

// ---------------- creación de especiales ----------------
test('4 en línea horizontal → rayaV en la celda movida, +120', () => {
  const p = nuevo(H4);
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  const c = de(pasos, 'crearEspecial')[0];
  assert.deepEqual(c.pos, pos(2, 2));
  assert.equal(c.ficha.especial, 'rayaV');
  assert.equal(p.tablero[2][2].ficha!.especial, 'rayaV');
  assert.equal(de(pasos, 'eliminar')[0].celdas.length, 3);
  assert.equal(p.puntos, 240 + 120);
  assert.deepEqual(de(pasos, 'jaleo').map((j) => j.nivel), [1]);
});

test('4 en línea vertical → rayaH', () => {
  const p = nuevo(V4);
  const pasos = p.intercambiar(pos(2, 1), pos(2, 2));
  assert.equal(de(pasos, 'crearEspecial')[0].ficha.especial, 'rayaH');
  assert.deepEqual(de(pasos, 'crearEspecial')[0].pos, pos(2, 2));
});

test('L (5 celdas cruzadas) → tarrina +200', () => {
  const p = nuevo(ELE);
  const pasos = p.intercambiar(pos(2, 2), pos(3, 2));
  assert.equal(de(pasos, 'crearEspecial')[0].ficha.especial, 'tarrina');
  assert.deepEqual(de(pasos, 'crearEspecial')[0].pos, pos(2, 2));
  assert.equal(p.puntos, 300 + 200);
});

test('5 en línea → bolaBolas +200 y sin sabor', () => {
  const p = nuevo(CINCO);
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  const f = de(pasos, 'crearEspecial')[0].ficha;
  assert.equal(f.especial, 'bolaBolas');
  assert.equal(f.sabor, -1);
  assert.equal(p.puntos, 300 + 200);
});

// ---------------- detonaciones ----------------
test('rayaH atrapada en un trío limpia su fila entera', () => {
  const p = nuevo(TRIO);
  especial(p, 2, 1, 'rayaH');
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  const d = de(pasos, 'detonar')[0];
  assert.equal(d.especial, 'rayaH');
  assert.deepEqual(conjunto(d.celdas), new Set(['2,0', '2,1', '2,2', '2,3', '2,4']));
  assert.equal(p.puntos, 180 + 2 * 60);
});

test('rayaV limpia su columna', () => {
  const p = nuevo(TRIO);
  especial(p, 2, 3, 'rayaV');
  const d = de(p.intercambiar(pos(1, 2), pos(2, 2)), 'detonar')[0];
  assert.deepEqual(conjunto(d.celdas), new Set(['0,3', '1,3', '2,3', '3,3', '4,3']));
});

test('tarrina explota 3x3 y otra vez 3x3 tras la caída', () => {
  const p = nuevo(TRIO);
  especial(p, 2, 1, 'tarrina');
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  const ds = de(pasos, 'detonar');
  assert.equal(ds.length, 2);
  assert.equal(ds[0].celdas.length, 9);
  assert.equal(ds[1].celdas.length, 9);
  const t = tipos(pasos);
  assert.ok(t.indexOf('caer') < t.lastIndexOf('detonar'), 'la segunda explosión va tras la primera caída');
});

test('cadena: una raya alcanzada por otra detonación también detona', () => {
  const p = nuevo(TRIO);
  especial(p, 2, 1, 'rayaH');
  especial(p, 2, 4, 'rayaV');
  const ds = de(p.intercambiar(pos(1, 2), pos(2, 2)), 'detonar');
  assert.deepEqual(ds.map((d) => d.especial), ['rayaH', 'rayaV']);
});

// ---------------- combos ----------------
test('raya+raya = fila y columna', () => {
  const p = nuevo(BASE);
  especial(p, 2, 1, 'rayaH'); especial(p, 2, 2, 'rayaV');
  const pasos = p.intercambiar(pos(2, 1), pos(2, 2));
  assert.equal(pasos[0].tipo, 'intercambio');
  const d = de(pasos, 'detonar')[0];
  assert.ok(d.combo);
  assert.equal(d.celdas.length, 9);
  assert.deepEqual(de(pasos, 'jaleo').map((j) => j.nivel), [3]);
  assert.equal(p.movimientosRestantes, 19);
});

test('raya+tarrina = 3 filas y 3 columnas', () => {
  const p = nuevo(BASE);
  especial(p, 2, 1, 'rayaH'); especial(p, 2, 2, 'tarrina');
  const d = de(p.intercambiar(pos(2, 1), pos(2, 2)), 'detonar')[0];
  assert.equal(d.celdas.length, 21);
});

test('tarrina+tarrina = 5x5 dos veces', () => {
  const p = nuevo(BASE);
  especial(p, 2, 1, 'tarrina'); especial(p, 2, 2, 'tarrina');
  const ds = de(p.intercambiar(pos(2, 1), pos(2, 2)), 'detonar');
  assert.equal(ds.length, 2);
  assert.equal(ds[0].celdas.length, 25);
});

test('bolaBolas+bola quita todas las de ese sabor', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'bolaBolas');
  const sabor = p.tablero[2][3].ficha!.sabor;
  const esperadas = p.tablero.flat().filter((c) => c.ficha && c.ficha.sabor === sabor).map((c) => c.ficha!.id);
  const pasos = p.intercambiar(pos(2, 2), pos(2, 3));
  const quitadas = de(pasos, 'eliminar').flatMap((e) => e.ids);
  for (const id of esperadas) assert.ok(quitadas.includes(id));
  assert.equal(de(pasos, 'detonar')[0].especial, 'bolaBolas');
  assert.equal(p.movimientosRestantes, 19);
});

test('bolaBolas+raya convierte todas las de su sabor en rayas y detonan', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'bolaBolas'); especial(p, 2, 3, 'rayaH');
  const s = p.tablero[2][3].ficha!.sabor;
  const normales = p.tablero.flat().filter((c) => c.ficha && c.ficha.sabor === s && c.ficha.especial === 'ninguno').length;
  const pasos = p.intercambiar(pos(2, 2), pos(2, 3));
  assert.equal(de(pasos, 'crearEspecial').length, normales);
  assert.ok(de(pasos, 'crearEspecial').every((c) => c.ficha.especial === 'rayaH' || c.ficha.especial === 'rayaV'));
  assert.ok(de(pasos, 'detonar').length > normales);
});

test('bolaBolas+tarrina convierte en tarrinas', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'bolaBolas'); especial(p, 2, 3, 'tarrina');
  const pasos = p.intercambiar(pos(2, 2), pos(2, 3));
  assert.ok(de(pasos, 'crearEspecial').length > 0);
  assert.ok(de(pasos, 'crearEspecial').every((c) => c.ficha.especial === 'tarrina'));
});

test('bolaBolas+bolaBolas limpia todo el tablero y jaleo 4', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'bolaBolas'); especial(p, 2, 3, 'bolaBolas');
  const pasos = p.intercambiar(pos(2, 2), pos(2, 3));
  assert.equal(de(pasos, 'eliminar')[0].celdas.length, 25);
  assert.deepEqual(de(pasos, 'jaleo').map((j) => j.nivel), [4]);
});

// ---------------- bloqueadores ----------------
test('mancha: al eliminar la ficha de encima baja una capa (+1000)', () => {
  const p = nuevo(TRIO);
  poner(p, 2, 2, { mancha: 2 });
  poner(p, 2, 3, { mancha: 1 });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.tablero[2][2].mancha, 1);
  assert.equal(p.tablero[2][3].mancha, 0);
  assert.deepEqual(de(pasos, 'mancha').map((m) => m.quedan).sort(), [0, 1]);
  assert.equal(p.puntos, 180 + 2000);
});

test('escarcha: un match al lado quita una capa y con 0 la celda recibe caída', () => {
  const p = nuevo(['01201', '12312', '23030', '01e01', '12012']);
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.tablero[3][2].escarcha, 0);
  assert.deepEqual(de(pasos, 'escarcha').map((e) => e.quedan), [0]);
  assert.ok(p.tablero[3][2].ficha, 'la celda liberada recibe una ficha');
  assert.ok(p.puntos >= 180 + 20); // más lo de alguna cascada
});

test('escarcha bloquea la caída: lo de arriba no la cruza, pero lo de debajo se rellena', () => {
  const q = nuevo(['01201', '12012', '20E20', '03031', '12312']);
  const arriba = q.tablero[1][2].ficha!.id;
  const pasos = q.intercambiar(pos(3, 2), pos(4, 2));
  assert.deepEqual(tipos(pasos).slice(0, 2), ['intercambio', 'eliminar']);
  assert.ok(q.tablero[3][2].ficha, 'bajo la escarcha entra una ficha (en diagonal)');
  assert.notEqual(q.tablero[3][2].ficha!.id, arriba, 'no es la de arriba: la escarcha no se cruza');
  assert.equal(q.tablero[2][2].escarcha, 1);
});

test('candado: un match que lo incluye lo abre y la ficha se queda', () => {
  const p = nuevo(TRIO);
  poner(p, 2, 1, { candado: true });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.tablero[2][1].candado, false);
  assert.equal(p.tablero[2][1].ficha!.sabor, 3);
  assert.deepEqual(de(pasos, 'candado').map((x) => x.pos), [pos(2, 1)]);
  assert.equal(de(pasos, 'eliminar')[0].celdas.length, 2);
});

// ---------------- gravedad ----------------
test('la ficha cae a través de un hueco', () => {
  const p = nuevo(['01201', '12012', '21.20', '03031', '12312']);
  const id = p.tablero[1][2].ficha!.id;
  p.intercambiar(pos(3, 2), pos(4, 2));
  assert.equal(p.tablero[2][2].existe, false);
  assert.equal(p.tablero[3][2].ficha!.id, id);
  assert.equal(hayTrios(p), false);
});

// ---------------- carapinas ----------------
test('carapina que llega a la salida sale y cuenta (+10000)', () => {
  const p = nuevo(['01201', '12012', '20120', '01p01', '33032'],
    { objetivo: { tipo: 'carapinas', n: 1 }, estrellas: [5000, 8000, 12000] });
  poner(p, 4, 2, { salida: true });
  assert.equal(p.progreso.carapinas, 1);
  const pasos = p.intercambiar(pos(4, 2), pos(4, 3));
  assert.equal(de(pasos, 'carapinaFuera').length, 1);
  assert.equal(p.progreso.carapinas, 0);
  assert.equal(p.estado, 'ganado');
  assert.ok(p.puntos >= 10180);
});

test('las carapinas entran por arriba mientras queden por salir y haya menos de 2', () => {
  const p = new Partida({ id: 1, nombre: 't', forma: ['ooooo', 'ooooo', 'ooooo', 'ooooo', 'sssss'], sabores: 4, movimientos: 200,
    objetivo: { tipo: 'carapinas', n: 3 }, estrellas: [1e9, 2, 3], carapinasPorSalir: 3, semilla: 5 });
  let entraron = 0, fuera = 0;
  for (let i = 0; i < 200 && p.estado === 'jugando'; i++) {
    const j = p.pista();
    if (!j) break;
    const pasos = p.intercambiar(j[0], j[1]);
    entraron += pasos.flatMap((x) => (x.tipo === 'caer' ? x.nuevas : [])).filter((n) => n.ficha.tipo === 'carapina').length;
    fuera += de(pasos, 'carapinaFuera').length;
    assert.ok(p.tablero.flat().filter((c) => c.ficha?.tipo === 'carapina').length <= 2);
  }
  assert.ok(entraron > 0 && fuera > 0);
});

// ---------------- barajar y pista ----------------
test('sin movimientos posibles: baraja las mismas fichas, sin tríos y con jugada', () => {
  const filas = Array.from({ length: 6 }, (_, f) => Array.from({ length: 6 }, (_, c) => (2 * f + c) % 6).join(''));
  const p = partidaDesde(filas);
  assert.equal(p.pista(), null);
  const antes = p.tablero.flat().map((c) => c.ficha!.id).sort((a, b) => a - b);
  const pasos = p.asegurarJugada();
  assert.deepEqual(tipos(pasos), ['barajar']);
  assert.notEqual(p.pista(), null);
  assert.equal(hayTrios(p), false);
  assert.deepEqual(p.tablero.flat().map((c) => c.ficha!.id).sort((a, b) => a - b), antes);
  const b = de(pasos, 'barajar')[0];
  for (const m of b.movimientos) assert.equal(p.tablero[m.hasta.f][m.hasta.c].ficha!.id, m.id);
});

test('pista devuelve un swap válido', () => {
  const p = nuevo(TRIO);
  const j = p.pista()!;
  assert.ok(j);
  const antes = p.movimientosRestantes;
  assert.notEqual(p.intercambiar(j[0], j[1])[0].tipo, 'invalido');
  assert.equal(p.movimientosRestantes, antes - 1);
});

// ---------------- fin de partida ----------------
test('ganar por pedido: se gana en cuanto se cumple, con bolazo y fin', () => {
  const p = nuevo(TRIO, { objetivo: { tipo: 'pedido', pedido: [{ sabor: 3, n: 3 }] }, estrellas: [100, 200, 300] });
  assert.deepEqual(p.progreso.pedido, [{ sabor: 3, n: 3 }]);
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'ganado');
  const t = tipos(pasos);
  assert.equal(t[t.length - 1], 'fin');
  assert.ok(t.includes('bolazo'));
  assert.ok(t.indexOf('bolazo') < t.length - 1);
  const fin = de(pasos, 'fin')[0];
  assert.equal(fin.estado, 'ganado');
  assert.ok(fin.estrellas >= 1);
  assert.equal(fin.estrellas, p.estrellas());
  assert.equal(p.movimientosRestantes, 0);
  assert.ok(p.puntos > 180, 'los movimientos sobrantes suman');
  assert.deepEqual(p.progreso.pedido, [{ sabor: 3, n: 0 }]);
});

test('ganar por manchas', () => {
  const p = nuevo(TRIO, { objetivo: { tipo: 'manchas' }, estrellas: [100, 200, 300] });
  poner(p, 2, 2, { mancha: 1 });
  assert.equal(p.progreso.manchas, 1);
  p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'ganado');
});

test('objetivo no-puntos: cumplirlo basta para ganar, siempre con 3 estrellas', () => {
  const p = nuevo(TRIO, { objetivo: { tipo: 'manchas' }, estrellas: [99999, 100000, 200000] });
  poner(p, 2, 2, { mancha: 1 });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'ganado');
  assert.deepEqual(de(pasos, 'fin')[0], { tipo: 'fin', estado: 'ganado', estrellas: 3 });
});

test('objetivo puntos: sin la primera estrella no se gana', () => {
  const p = nuevo(TRIO, { estrellas: [99999, 100000, 200000] });
  p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'jugando');
});

test('objetivo puntos: se juegan todos los movimientos; al acabar, con la 1ª estrella se gana por umbrales y sin bolazo', () => {
  const p = nuevo(TRIO, { estrellas: [150, 400, 900], movimientos: 2 });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.ok(p.puntos >= 150);
  assert.equal(p.estado, 'jugando', 'aunque ya tenga la estrella 1, la partida sigue');
  assert.equal(p.movimientosRestantes, 1);
  assert.equal(de(pasos, 'fin').length, 0);
  const q = nuevo(TRIO, { estrellas: [150, 400, 900], movimientos: 1 });
  const pasos2 = q.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(q.estado, 'ganado');
  assert.equal(de(pasos2, 'bolazo').length, 0);
  assert.deepEqual(de(pasos2, 'fin')[0], { tipo: 'fin', estado: 'ganado', estrellas: [150, 400, 900].filter((x) => q.puntos >= x).length });
});

test('objetivo puntos: sin llegar a la 1ª estrella al acabar los movimientos se pierde', () => {
  const p = nuevo(TRIO, { estrellas: [99999, 100000, 200000], movimientos: 1 });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'perdido');
  assert.deepEqual(de(pasos, 'fin')[0], { tipo: 'fin', estado: 'perdido', estrellas: 0 });
});

test('perder: sin movimientos y sin objetivo', () => {
  const p = nuevo(TRIO, { movimientos: 1, estrellas: [99999, 2, 3] });
  const pasos = p.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(p.estado, 'perdido');
  assert.deepEqual(de(pasos, 'fin')[0], { tipo: 'fin', estado: 'perdido', estrellas: 0 });
  assert.deepEqual(tipos(p.intercambiar(pos(1, 2), pos(2, 2))), ['invalido']);
});

test('estrellas() según umbrales', () => {
  const p = nuevo(TRIO, { estrellas: [100, 200, 300] });
  for (const [pt, e] of [[0, 0], [99, 0], [100, 1], [250, 2], [300, 3]] as const) {
    p.puntos = pt;
    assert.equal(p.estrellas(), e);
  }
});

// ---------------- jaleo ----------------
test('jaleo: ninguno en un trío simple', () => {
  const p = nuevo(TRIO);
  assert.equal(de(p.intercambiar(pos(1, 2), pos(2, 2)), 'jaleo').length, 0);
});

// ---------------- partidas enteras (propiedades) ----------------
test('partidas completas con jugadas automáticas respetan las invariantes', () => {
  const formas: string[][] = [
    ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
    ['..ooo..', 'ooommoo', 'oomMmoo', 'oooooeo', 'okoooEo', 'ooooooo', 'ooooooo', '.ooooo.'],
    ['ooooooo', 'oocooco', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'sssssss'],
  ];
  for (let semilla = 1; semilla <= 12; semilla++) {
    const forma = formas[semilla % formas.length];
    const carap = forma === formas[2];
    const p = new Partida({ id: semilla, nombre: 't', forma, sabores: 5, movimientos: 40, objetivo: carap ? { tipo: 'carapinas', n: 3 } : { tipo: 'puntos' },
      estrellas: [1e9, 2e9, 3e9], carapinasPorSalir: carap ? 2 : 0, semilla });
    let ultimo = 0;
    while (p.estado === 'jugando') {
      const j = p.pista();
      assert.notEqual(j, null, `siempre hay jugada (semilla ${semilla})`);
      const antes = p.movimientosRestantes;
      const pasos = p.intercambiar(j![0], j![1]);
      assert.equal(p.movimientosRestantes, antes - 1);
      assert.equal(hayTrios(p), false, `sin tríos (semilla ${semilla})`);
      const ids = p.tablero.flat().filter((c) => c.ficha).map((c) => c.ficha!.id);
      assert.equal(new Set(ids).size, ids.length);
      for (const c of p.tablero.flat()) if (!c.existe) assert.equal(c.ficha, null);
      assert.ok(p.puntos >= ultimo);
      ultimo = p.puntos;
      if (p.estado !== 'jugando') assert.equal(tipos(pasos).at(-1), 'fin');
    }
  }
});

test('potenciadores previos: ponen raya, tarrina y bola Bolas sin crear tríos', () => {
  const p = new Partida({ id: 0, nombre: 't', forma: ['ooooo', 'ooooo', 'ooooo', 'ooooo', 'ooooo'], sabores: 5, movimientos: 20, objetivo: { tipo: 'puntos' }, estrellas: [1, 2, 3], semilla: 7 });
  p.ponerPotenciadores(['rayaH', 'tarrina', 'bolaBolas']);
  const esp = p.tablero.flat().map((c) => c.ficha!).filter((f) => f.especial !== 'ninguno');
  assert.equal(esp.length, 3);
  assert.ok(esp.some((f) => f.especial === 'rayaH' || f.especial === 'rayaV'));
  assert.ok(esp.some((f) => f.especial === 'tarrina'));
  assert.ok(esp.some((f) => f.especial === 'bolaBolas' && f.sabor === -1));
  assert.equal(hayTrios(p), false);
});

// ---------------- potenciadores dentro de la partida ----------------
test('cuchara: rompe una bola, rellena y no gasta movimiento', () => {
  const p = nuevo(BASE);
  const pasos = p.usarCuchara(pos(2, 2));
  assert.equal(p.movimientosRestantes, 20);
  assert.deepEqual(de(pasos, 'eliminar')[0].celdas, [pos(2, 2)]);
  assert.ok(p.puntos >= 60);
  assert.ok(p.tablero.flat().every((c) => c.ficha));
  assert.equal(p.estado, 'jugando');
});

test('cuchara sobre una raya la detona', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'rayaH');
  const pasos = p.usarCuchara(pos(2, 2));
  assert.equal(de(pasos, 'detonar').length, 1);
  assert.equal(conjunto(de(pasos, 'eliminar').flatMap((x) => x.celdas)).size, 5);
  assert.equal(p.movimientosRestantes, 20);
});

test('cuchara quita una capa de escarcha y abre un candado (la ficha se queda)', () => {
  const p = nuevo(['01201', '12012', '20120', '01201', 'EeEee']);
  const pasos = p.usarCuchara(pos(4, 0));
  assert.deepEqual(de(pasos, 'escarcha').map((x) => [x.pos, x.quedan]), [[pos(4, 0), 1]]);
  assert.equal(p.tablero[4][0].escarcha, 1);
  const q = nuevo(BASE);
  poner(q, 2, 2, { candado: true });
  const id = q.tablero[2][2].ficha!.id;
  const pasos2 = q.usarCuchara(pos(2, 2));
  assert.deepEqual(de(pasos2, 'candado').map((x) => x.pos), [pos(2, 2)]);
  assert.equal(q.tablero[2][2].ficha!.id, id);
  assert.equal(q.tablero[2][2].candado, false);
});

test('cuchara sin nada que romper devuelve []', () => {
  const p = nuevo(['01201', '12012', '20p20', '01.01', '12012']);
  assert.deepEqual(p.usarCuchara(pos(2, 2)), []); // carapina
  assert.deepEqual(p.usarCuchara(pos(3, 2)), []); // hueco
  assert.deepEqual(p.usarCuchara(pos(9, 9)), []); // fuera
  assert.equal(p.puntos, 0);
});

test('cuchara que cumple el objetivo emite fin y gana; en partida acabada no hace nada', () => {
  const p = nuevo(BASE, { objetivo: { tipo: 'manchas' } });
  poner(p, 2, 2, { mancha: 1 });
  const pasos = p.usarCuchara(pos(2, 2));
  assert.equal(p.estado, 'ganado');
  assert.deepEqual(de(pasos, 'fin').map((x) => x.estado), ['ganado']);
  assert.deepEqual(p.usarCuchara(pos(0, 0)), []);
});

test('cuchara con barajado automático deja siempre una jugada', () => {
  const p = partidaDesde(BASE);
  p.usarCuchara(pos(2, 2));
  assert.equal(hayTrios(p), false);
  assert.notEqual(p.pista(), null);
});

test('mano libre: cambia sin match y sin gastar movimiento', () => {
  const p = nuevo(BASE);
  const a = p.tablero[0][0].ficha!.id, b = p.tablero[0][1].ficha!.id;
  const pasos = p.intercambioLibre(pos(0, 0), pos(0, 1));
  assert.equal(p.movimientosRestantes, 20);
  assert.equal(p.tablero[0][0].ficha!.id, b);
  assert.equal(p.tablero[0][1].ficha!.id, a);
  assert.deepEqual(tipos(pasos), ['intercambio']);
});

test('mano libre con match se resuelve normal y puede ganar', () => {
  const p = nuevo(TRIO, { objetivo: { tipo: 'manchas' } });
  poner(p, 2, 2, { mancha: 1 });
  const pasos = p.intercambioLibre(pos(1, 2), pos(2, 2));
  assert.equal(p.movimientosRestantes, 0); // ganar vacía los movimientos sobrantes (bolazo)
  assert.equal(de(pasos, 'eliminar').length >= 1, true);
  assert.equal(p.estado, 'ganado');
  assert.equal(de(pasos, 'fin').length, 1);
});

test('mano libre no mueve candados, escarcha, carapinas ni fichas no adyacentes', () => {
  const p = nuevo(['01201', '12012', '20p20', '01201', 'ee012']);
  poner(p, 0, 0, { candado: true });
  const antes = JSON.stringify(p.tablero);
  for (const [a, b] of [[pos(0, 0), pos(0, 1)], [pos(2, 2), pos(2, 3)], [pos(4, 0), pos(4, 1)], [pos(4, 2), pos(4, 3)], [pos(1, 0), pos(1, 2)]] as [Pos, Pos][]) {
    if (b.c === 3 && a.f === 4) continue; // 4,2↔4,3 son dos bolas válidas
    assert.deepEqual(tipos(p.intercambioLibre(a, b)), ['invalido']);
  }
  assert.equal(JSON.stringify(p.tablero), antes);
});

test('sumarMovimientos: suma y revive una partida perdida por movimientos', () => {
  const p = nuevo(BASE, { movimientos: 1 });
  p.intercambioLibre(pos(0, 0), pos(0, 1)); // gratis
  p.sumarMovimientos(2);
  assert.equal(p.movimientosRestantes, 3);
  const q = nuevo(BASE, { movimientos: 1 });
  q.intercambiar(...(q.pista() ?? [pos(0, 0), pos(0, 1)]));
  q.movimientosRestantes = 0; q.estado = 'perdido';
  q.sumarMovimientos(5);
  assert.equal(q.estado, 'jugando');
  assert.equal(q.movimientosRestantes, 5);
  const g = nuevo(TRIO, { objetivo: { tipo: 'manchas' } });
  poner(g, 2, 2, { mancha: 1 });
  g.intercambiar(pos(1, 2), pos(2, 2));
  assert.equal(g.estado, 'ganado');
  g.sumarMovimientos(5);
  assert.equal(g.estado, 'ganado'); // ganado no se revive
});

// ---------------- relleno bajo candados y barajado de emergencia ----------------
test('bajo un candado las casillas vaciadas se rellenan (por arriba del tramo)', () => {
  const p = nuevo(['01201', '12012', '20120', '01201', '12012']);
  poner(p, 1, 2, { candado: true });
  // Se rompen las dos de debajo del candado: el tramo (2,2)-(4,2) debe quedar lleno.
  p.usarCuchara(pos(3, 2));
  p.usarCuchara(pos(4, 2));
  for (let f = 0; f < 5; f++) assert.ok(p.tablero[f][2].ficha, `vacía (${f},2)`);
  assert.equal(p.tablero[1][2].candado, true);
});

test('barajado imposible: regenera las bolas y deja jugada', () => {
  const p = partidaDesde(['012', '345', '678'], { sabores: 6 });
  const pasos = p.asegurarJugada();
  assert.deepEqual(tipos(pasos), ['eliminar', 'caer']);
  assert.notEqual(p.pista(), null);
  assert.equal(hayTrios(p), false);
});

test('carapinas por salir: si el tablero se queda sin carapinas, entra una seguro en la siguiente caída', () => {
  const p = nuevo(['01201', '12012', '20120', '01p01', '33032'],
    { objetivo: { tipo: 'carapinas', n: 2 }, carapinasPorSalir: 1, estrellas: [1, 2, 3], movimientos: 20 });
  poner(p, 4, 2, { salida: true });
  const pasos = p.intercambiar(pos(4, 2), pos(4, 3));
  assert.equal(de(pasos, 'carapinaFuera').length, 1);
  assert.equal(p.progreso.carapinas, 1);
  const hay = p.tablero.flat().filter((c) => c.ficha?.tipo === 'carapina').length;
  assert.equal(hay, 1, 'la tercera ya está en el tablero');
  assert.equal(p.estado, 'jugando');
});

// ---------------- caída diagonal ----------------
test('candado: bajo él las casillas se rellenan con fichas que bajan en diagonal desde las columnas vecinas', () => {
  const p = nuevo(['01201', '12012', '20120', '01201', '12012']);
  poner(p, 2, 2, { candado: true });
  const vecinas = [p.tablero[1][1].ficha!.id, p.tablero[1][3].ficha!.id];
  const todos: Paso[] = [...p.usarCuchara(pos(3, 2)), ...p.usarCuchara(pos(4, 2))];
  const movs = de(todos, 'caer').flatMap((x) => x.movimientos);
  const diag = movs.filter((m) => m.desde.c !== m.hasta.c);
  assert.ok(diag.length >= 1, 'hay al menos un movimiento diagonal');
  assert.ok(diag.some((m) => vecinas.includes(m.id)));
  for (const m of diag) assert.ok(Math.abs(m.desde.c - m.hasta.c) === 1 && m.hasta.f - m.desde.f === 1);
  for (let f = 0; f < 5; f++) assert.ok(p.tablero[f][2].ficha, `vacía (${f},2)`);
  assert.equal(p.tablero[2][2].candado, true);
});

test('niveles 1-60: tras caer() no queda ninguna casilla vacía (30 jugadas al azar)', async () => {
  const { nivel } = await import('../datos/episodios.ts');
  let semilla = 12345;
  const azar = () => { semilla = (Math.imul(semilla, 1103515245) + 12345) >>> 0; return semilla / 4294967296; };
  for (let id = 1; id <= 60; id++) {
    const base = nivel(id);
    const p = new Partida({ ...base, movimientos: 99, estrellas: [1e12, 2e12, 3e12] });
    for (let j = 0; j < 30 && p.estado === 'jugando'; j++) {
      const jugadas: [Pos, Pos][] = [];
      for (let f = 0; f < p.tablero.length; f++) for (let c = 0; c < p.tablero[0].length; c++) for (const b of [{ f, c: c + 1 }, { f: f + 1, c }]) {
        if ((p as any).valido({ f, c }, b)) jugadas.push([{ f, c }, b]);
      }
      if (!jugadas.length) break;
      const [a, b] = jugadas[Math.floor(azar() * jugadas.length)];
      p.intercambiar(a, b);
      p.tablero.forEach((fila, f) => fila.forEach((ce, c) => {
        if (ce.existe && ce.escarcha === 0 && ce.pala === undefined) assert.ok(ce.ficha, `nivel ${id}, jugada ${j}: vacía (${f},${c})`);
      }));
    }
  }
});

// ---------------- sacabolas (cuadrado 2x2) ----------------
const CUADRO = ['01201', '13312', '23130', '01201', '12012']; // (2,3)→(2,2) cierra un cuadrado de 3 sin línea

test('sacabolas: un cuadrado 2x2 es jugada válida y crea el sacabolas donde movió el jugador', () => {
  const p = nuevo(CUADRO);
  assert.notEqual(p.pista(), null);
  const pasos = p.intercambiar(pos(2, 3), pos(2, 2));
  const crea = de(pasos, 'crearEspecial');
  assert.equal(crea.length, 1);
  assert.equal(crea[0].ficha.especial, 'sacabolas');
  assert.deepEqual(crea[0].pos, pos(2, 2));
  assert.equal(de(pasos, 'eliminar')[0].celdas.length, 3);
});

test('sacabolas: quita la cruz y vuela a la única mancha del tablero', () => {
  const p = nuevo(BASE, { objetivo: { tipo: 'manchas' } });
  especial(p, 2, 2, 'sacabolas');
  poner(p, 4, 4, { mancha: 1 });
  const pasos = p.usarCuchara(pos(2, 2));
  const det = de(pasos, 'detonar').find((d) => d.especial === 'sacabolas')!;
  assert.deepEqual(conjunto(det.celdas), conjunto([pos(2, 2), pos(1, 2), pos(3, 2), pos(2, 1), pos(2, 3)]));
  const vuelos = de(pasos, 'vuelo');
  assert.equal(vuelos.length, 1);
  assert.deepEqual(vuelos[0].hasta, pos(4, 4));
  assert.equal(p.tablero[4][4].mancha, 0);
  assert.equal(p.estado, 'ganado');
});

test('sacabolas: en carapinas vuela a la casilla de debajo de una carapina', () => {
  const p = nuevo(BASE, { objetivo: { tipo: 'carapinas', n: 1 } });
  especial(p, 4, 0, 'sacabolas');
  p.tablero[0][4].ficha = { id: 1, tipo: 'carapina', sabor: -1, especial: 'ninguno' };
  const pasos = p.usarCuchara(pos(4, 0));
  assert.deepEqual(de(pasos, 'vuelo')[0].hasta, pos(1, 4));
});

test('sacabolas + sacabolas: salen 3 a casillas distintas', () => {
  const p = nuevo(BASE);
  especial(p, 2, 2, 'sacabolas');
  especial(p, 2, 3, 'sacabolas');
  const vuelos = de(p.intercambiar(pos(2, 3), pos(2, 2)), 'vuelo');
  assert.equal(vuelos.length, 3);
  assert.equal(conjunto(vuelos.map((v) => v.hasta)).size, 3);
});

test('sacabolas + raya: vuela con la raya y la detona en el destino', () => {
  const p = nuevo(BASE, { objetivo: { tipo: 'manchas' } });
  especial(p, 2, 2, 'sacabolas');
  especial(p, 2, 3, 'rayaH');
  poner(p, 0, 0, { mancha: 1 });
  const pasos = p.intercambiar(pos(2, 3), pos(2, 2));
  const v = de(pasos, 'vuelo')[0];
  assert.equal(v.carga, 'rayaH');
  assert.deepEqual(v.hasta, pos(0, 0));
  const raya = de(pasos, 'detonar').find((d) => d.especial === 'rayaH' && d.pos.f === 0)!;
  assert.equal(raya.celdas.length, 5);
});

test('relleno inicial: sin cuadrados 2x2 hechos', () => {
  for (let semilla = 1; semilla <= 30; semilla++) {
    const p = new Partida({ id: 1, nombre: 't', forma: Array(7).fill('ooooooo'), sabores: 4, movimientos: 20, objetivo: { tipo: 'puntos' }, estrellas: [1, 2, 3], semilla });
    const s = (f: number, c: number) => p.tablero[f]?.[c]?.ficha?.sabor ?? -1;
    for (let f = 0; f < 6; f++) for (let c = 0; c < 6; c++) {
      const v = s(f, c);
      assert.ok(!(v === s(f, c + 1) && v === s(f + 1, c) && v === s(f + 1, c + 1)), `semilla ${semilla} (${f},${c})`);
    }
  }
});

// ---------------- pala de helado ----------------
test('pala: se llena con golpes y a la 3ª suelta una carapina debajo', () => {
  const p = nuevo(BASE, { objetivo: { tipo: 'carapinas', n: 2 } });
  poner(p, 0, 2, { pala: 0, ficha: null });
  assert.deepEqual(de(p.usarCuchara(pos(0, 2)), 'pala').map((x) => x.carga), [1]);
  p.usarCuchara(pos(0, 2));
  const ultimo = de(p.usarCuchara(pos(0, 2)), 'pala')[0];
  assert.equal(ultimo.carga, 0);
  assert.deepEqual(ultimo.suelta?.hasta, pos(1, 2));
  assert.equal(p.tablero[1][2].ficha?.tipo, 'carapina');
  assert.equal(p.tablero[0][2].ficha, null); // la pala no cae ni se rellena
});

test('pala: un match al lado la llena; si no hacen falta carapinas se queda llena', () => {
  const p = nuevo(['01201', '12312', '23030', '0p201', '12012']);
  poner(p, 3, 1, { pala: 2, ficha: null });
  const pala = de(p.intercambiar(pos(1, 2), pos(2, 2)), 'pala');
  assert.equal(pala.length, 1);
  assert.equal(pala[0].carga, 3);
  assert.equal(pala[0].suelta, undefined);
});
