import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EPISODIO_1 } from './niveles.ts';
import { EQUIPO } from './equipo.ts';
import { SABORES } from './sabores.ts';

const PERMITIDOS = new Set('.omMeEkKcs');
const niveles = EPISODIO_1.niveles;

test('15 niveles con ids 1..15', () => {
  assert.deepEqual(niveles.map((n) => n.id), Array.from({ length: 15 }, (_, i) => i + 1));
});

test('hay 6 sabores', () => assert.equal(SABORES.length, 6));

for (const n of niveles) {
  test(`nivel ${n.id}: ${n.nombre}`, () => {
    const { forma } = n;
    assert.ok(forma.length >= 1 && forma.length <= 9, 'filas 1..9');
    assert.ok(forma.every((f) => f.length === forma[0].length), 'filas del mismo largo');
    assert.ok(forma[0].length <= 9, 'ancho máximo 9');
    const todo = forma.join('');
    for (const ch of todo) assert.ok(PERMITIDOS.has(ch), `carácter no permitido: ${ch}`);
    assert.ok(n.sabores >= 4 && n.sabores <= 6, 'sabores 4-6');
    assert.ok(n.movimientos > 0);
    const [a, b, c] = n.estrellas;
    assert.ok(a > 0 && a < b && b < c, 'estrellas crecientes');

    const o = n.objetivo;
    if (o.tipo === 'manchas') assert.ok(/[mMK]/.test(todo), 'manchas sin m/M/K');
    if (o.tipo === 'carapinas') {
      assert.ok(todo.includes('s'), 'carapinas sin salida');
      const iniciales = [...todo].filter((x) => x === 'c').length;
      assert.ok(o.n <= iniciales + (n.carapinasPorSalir ?? 0), 'más carapinas pedidas que disponibles');
    }
    if (o.tipo === 'pedido') {
      for (const p of o.pedido) assert.ok(p.sabor >= 0 && p.sabor < n.sabores, 'sabor del pedido fuera de los que salen');
    }

    const alto = forma.length;
    for (let col = 0; col < forma[0].length; col++) {
      const celdas = forma.map((f) => f[col]);
      const existentes = celdas.map((x, i) => (x === '.' ? -1 : i)).filter((i) => i >= 0);
      if (!existentes.length) continue;
      const ultima = existentes[existentes.length - 1];
      // 's' solo en la celda más baja existente de su columna
      celdas.forEach((x, i) => { if (x === 's') assert.equal(i, ultima, `'s' no está abajo en columna ${col}`); });
      // una carapina inicial necesita salida en su columna
      if (celdas.includes('c')) assert.ok(celdas.includes('s'), `carapina sin salida en columna ${col}`);
      // la escarcha bloquea la caída: debajo solo puede haber hueco o más escarcha
      celdas.forEach((x, i) => {
        if (x === 'e' || x === 'E') for (let j = i + 1; j < alto; j++) assert.ok('.eE'.includes(celdas[j]), `escarcha bloquea la columna ${col}`);
      });
    }
    if (n.presenta) assert.ok(EQUIPO.some((p) => p.id === n.presenta!.quien), 'presentador desconocido');
  });
}

test('equipo con 3+ frases', () => {
  for (const p of EQUIPO) assert.ok(p.frasesGanar.length >= 3 && p.frasesPerder.length >= 3, p.id);
});
