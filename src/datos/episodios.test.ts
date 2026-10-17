import { test } from 'node:test';
import assert from 'node:assert/strict';
import { episodioDe, esDificil, nivel, NIVELES_POR_EPISODIO } from './episodios.ts';
import { EPISODIO_1 } from './niveles.ts';
import { EQUIPO } from './equipo.ts';
import { PLANTILLAS, tasaMeta } from './generador.ts';
import { SABORES } from './sabores.ts';
import { Partida } from '../motor/index.ts';
import type { Nivel } from '../motor/index.ts';

const PERMITIDOS = new Set('.omMeEkKcs');
const NUMEROS: Record<string, number> = { doce: 12, trece: 13, catorce: 14, quince: 15, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20 };

/** Mismas reglas que niveles.test.ts, aplicadas a un nivel cualquiera. */
function validar(n: Nivel): void {
  const { forma } = n;
  assert.ok(forma.length >= 4 && forma.length <= 9, `filas ${n.id}`);
  assert.ok(forma.every((f) => f.length === forma[0].length) && forma[0].length <= 9, `ancho ${n.id}`);
  const todo = forma.join('');
  for (const ch of todo) assert.ok(PERMITIDOS.has(ch), `carácter ${ch} en ${n.id}`);
  assert.ok(n.sabores >= 5 && n.sabores <= 6);
  assert.ok(Number.isInteger(n.movimientos) && n.movimientos >= 6 && n.movimientos <= 80, `movimientos ${n.id}: ${n.movimientos}`);
  const [a, b, c] = n.estrellas;
  assert.ok(a > 0 && a < b && b < c, `estrellas ${n.id}`);
  const o = n.objetivo;
  if (o.tipo === 'manchas') assert.ok(/[mMK]/.test(todo));
  if (o.tipo === 'carapinas') {
    assert.ok(todo.includes('s'));
    assert.ok(o.n === [...todo].filter((x) => x === 'c').length + (n.carapinasPorSalir ?? 0), `carapinas ${n.id}`);
  }
  if (o.tipo === 'pedido') {
    assert.ok(o.pedido.length >= 2);
    assert.equal(new Set(o.pedido.map((p) => p.sabor)).size, o.pedido.length);
    for (const p of o.pedido) assert.ok(p.sabor >= 0 && p.sabor < n.sabores && p.n > 0);
  }
  for (let col = 0; col < forma[0].length; col++) {
    const celdas = forma.map((f) => f[col]);
    const existentes = celdas.map((x, i) => (x === '.' ? -1 : i)).filter((i) => i >= 0);
    if (!existentes.length) continue;
    const ultima = existentes[existentes.length - 1];
    celdas.forEach((x, i) => { if (x === 's') assert.equal(i, ultima, `'s' no está abajo (${n.id}, col ${col})`); });
    if (celdas.includes('c')) assert.ok(celdas.includes('s'), `carapina sin salida (${n.id}, col ${col})`);
    celdas.forEach((x, i) => {
      if (x === 'e' || x === 'E') for (let j = i + 1; j < celdas.length; j++) assert.ok('.eE'.includes(celdas[j]), `escarcha bloquea (${n.id}, col ${col})`);
    });
  }
  assert.ok(n.presenta && EQUIPO.some((p) => p.id === n.presenta!.quien), `presentador ${n.id}`);
}

/** Los números que dice el presentador cuadran con lo que pide el nivel. */
function textoCuadra(n: Nivel): void {
  const t = n.presenta!.texto.toLowerCase();
  const o = n.objetivo;
  const dice = (v: number) => new RegExp(`(^|[^\\d])${v}([^\\d]|$)`).test(t) || Object.entries(NUMEROS).some(([w, x]) => x === v && t.includes(w));
  if (o.tipo === 'pedido') {
    for (const p of o.pedido) assert.ok(dice(p.n), `nivel ${n.id}: el texto no dice ${p.n} («${t}»)`);
    for (const p of o.pedido) assert.ok(t.includes(SABORES[p.sabor].nombre.toLowerCase()), `nivel ${n.id}: falta el sabor ${SABORES[p.sabor].nombre}`);
    // y no menciona sabores que no pide
    SABORES.forEach((s, i) => { if (!o.pedido.some((p) => p.sabor === i)) assert.ok(!t.includes(s.nombre.toLowerCase()), `nivel ${n.id}: menciona ${s.nombre}`); });
  }
  if (o.tipo === 'carapinas' && n.id > 15) assert.ok(dice(o.n), `nivel ${n.id}: el texto no dice ${o.n} carapinas («${t}»)`);
  if (o.tipo === 'puntos' && n.id > 15) assert.ok(t.includes(n.estrellas[0].toLocaleString('es-ES')), `nivel ${n.id}: el texto no dice los puntos`);
}

test('plantillas: simétricas, rectangulares y de 9x9 como mucho', () => {
  assert.ok(PLANTILLAS.length >= 12 && PLANTILLAS.length <= 20);
  for (const p of PLANTILLAS) {
    assert.ok(p.length <= 9 && p[0].length <= 9);
    for (const f of p) {
      assert.equal(f.length, p[0].length);
      assert.equal(f, [...f].reverse().join(''), `no simétrica: ${f}`);
      assert.ok(/^[.o]+$/.test(f));
    }
  }
});

test('niveles 1-15 son EPISODIO_1 tal cual', () => {
  for (let i = 1; i <= 15; i++) assert.equal(nivel(i), EPISODIO_1.niveles[i - 1]);
});

test('episodioDe: tiendas reales, temporadas y presentadores rotando', () => {
  assert.equal(episodioDe(1).nombre, 'Herbolarios');
  assert.equal(episodioDe(1).tienda, 'C/ Herbolarios 20');
  assert.equal(episodioDe(15).n, 1);
  assert.equal(episodioDe(16).nombre, 'Orfila');
  assert.equal(episodioDe(16).tienda, 'Orfila, 1');
  assert.equal(episodioDe(31).tienda, 'Feria, 39');
  assert.equal(episodioDe(46).tienda, 'Castilla, 4');
  assert.equal(episodioDe(61).tienda, 'Jimios, 2');
  assert.match(episodioDe(76).tienda, /Mojarra/);
  assert.equal(episodioDe(91).nombre, 'Obrador');
  assert.equal(episodioDe(106).nombre, 'Eventos');
  assert.equal(episodioDe(121).nombre, 'Herbolarios (Temporada 2)');
  assert.equal(episodioDe(16 + 15 * 8).nombre, 'Orfila (Temporada 2)');
  assert.equal(episodioDe(1 + 15 * 16).nombre, 'Herbolarios (Temporada 3)');
  const quienes = new Set(Array.from({ length: 10 }, (_, i) => episodioDe(1 + 15 * i).quien));
  assert.equal(quienes.size, EQUIPO.length);
  for (const q of quienes) assert.ok(EQUIPO.some((p) => p.id === q));
});

test('esDificil: posiciones 5, 10 y 15 de cada episodio', () => {
  for (let id = 1; id <= 150; id++) assert.equal(esDificil(id), [5, 10, 15].includes(((id - 1) % NIVELES_POR_EPISODIO) + 1), `id ${id}`);
});

test('tasaMeta: dientes de sierra, baja 1 punto por episodio y no pasa de 35 %', () => {
  assert.equal(tasaMeta(1), 0.8);
  assert.equal(tasaMeta(5), 0.55);
  assert.equal(tasaMeta(15), 0.42);
  assert.ok(Math.abs(tasaMeta(15 + 15) - 0.41) < 1e-9);
  assert.equal(tasaMeta(15 * 100), 0.35);
});

test('nivel(id) es determinista', () => {
  for (const id of [16, 17, 30, 45, 99, 250, 500]) {
    assert.deepEqual(nivel(id), JSON.parse(JSON.stringify(nivel(id))));
  }
  // sin caché y en otro orden: mismo resultado
  const a = [20, 16, 400].map((id) => JSON.stringify(nivel(id)));
  const b = [400, 16, 20].map((id) => JSON.stringify(nivel(id))).reverse();
  assert.deepEqual(a, b);
});

test('niveles 16-500: forma, objetivo y presentador válidos', () => {
  for (let id = 16; id <= 500; id++) {
    const n = nivel(id);
    assert.equal(n.id, id);
    validar(n);
    textoCuadra(n);
  }
});

test('niveles 1-15: los números de los textos cuadran con el pedido', () => {
  for (const n of EPISODIO_1.niveles) if (n.presenta) textoCuadra(n);
});

test('niveles 16-500: hay variedad de objetivos, formas y bloqueadores', () => {
  const ns = Array.from({ length: 485 }, (_, i) => nivel(16 + i));
  assert.equal(new Set(ns.map((n) => n.objetivo.tipo)).size, 4);
  assert.ok(new Set(ns.map((n) => n.forma.join('/'))).size > 100);
  for (const re of [/[eE]/, /[kK]/, /M/, /c/]) assert.ok(ns.some((n) => re.test(n.forma.join(''))), String(re));
});

test('niveles 16-500: se pueden jugar (sin tríos hechos, con jugada, carapinas y pedido alcanzables)', () => {
  for (let id = 16; id <= 500; id++) {
    const n = nivel(id);
    const p = new Partida(n);
    assert.notEqual(p.pista(), null, `nivel ${id} sin jugadas`);
    if (n.objetivo.tipo === 'pedido') for (const x of n.objetivo.pedido) assert.ok(x.sabor < n.sabores);
  }
});
