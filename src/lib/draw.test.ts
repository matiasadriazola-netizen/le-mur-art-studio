import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWinner, newSeed, sha256, ticketListOf } from './draw';

const tickets = Array.from({ length: 20 }, (_, i) => ({ number: i + 1, orderId: `o${(i % 7) + 1}` }));

test('el mismo input siempre da el mismo ganador', () => {
  const a = computeWinner('semilla', tickets);
  const b = computeWinner('semilla', [...tickets].reverse());
  assert.equal(a.winner.number, b.winner.number);
  assert.equal(a.digest, b.digest);
});

test('el ganador es uno de los tickets vendidos', () => {
  for (let i = 0; i < 50; i++) {
    const { seed } = newSeed();
    const r = computeWinner(seed, tickets);
    assert.ok(tickets.some((t) => t.number === r.winner.number));
  }
});

test('el hash publicado corresponde a la semilla', () => {
  const { seed, seedHash } = newSeed();
  assert.equal(sha256(seed), seedHash);
});

test('la lista queda ordenada por número', () => {
  assert.equal(ticketListOf([{ number: 3, orderId: 'b' }, { number: 1, orderId: 'a' }]), '1:a,3:b');
});

test('la distribución es razonablemente pareja', () => {
  const counts = new Map<number, number>();
  for (let i = 0; i < 4000; i++) {
    const n = computeWinner(`s${i}`, tickets).winner.number;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  assert.equal(counts.size, 20);
  for (const c of counts.values()) assert.ok(c > 120 && c < 290, `conteo fuera de rango: ${c}`);
});
