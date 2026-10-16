import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAzar } from './azar.ts';

test('misma semilla, misma secuencia', () => {
  const a = crearAzar(42);
  const b = crearAzar(42);
  for (let i = 0; i < 50; i++) assert.equal(a.siguiente(), b.siguiente());
});

test('semillas distintas dan secuencias distintas', () => {
  assert.notEqual(crearAzar(1).siguiente(), crearAzar(2).siguiente());
});

test('entero queda en rango y barajar conserva los elementos', () => {
  const r = crearAzar(7);
  for (let i = 0; i < 200; i++) {
    const n = r.entero(6);
    assert.ok(n >= 0 && n < 6 && Number.isInteger(n));
  }
  assert.deepEqual(r.barajar([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});
