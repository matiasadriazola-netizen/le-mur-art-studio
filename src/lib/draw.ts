import { createHash, randomBytes } from 'node:crypto';

/**
 * Sorteo verificable (commit–reveal).
 *
 * 1. Al publicar un sorteo se genera una semilla secreta y se publica solo su hash.
 * 2. Al sortear, el ganador sale de sha256(semilla | lista de tickets vendidos).
 * 3. Después del sorteo se publica la semilla: cualquiera puede recalcular
 *    el hash y el ganador, y comprobar que la semilla no cambió.
 */

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function newSeed() {
  const seed = randomBytes(32).toString('hex');
  return { seed, seedHash: sha256(seed) };
}

export type DrawTicket = { number: number; orderId: string };

export function ticketListOf(tickets: DrawTicket[]) {
  return [...tickets].sort((a, b) => a.number - b.number).map((t) => `${t.number}:${t.orderId}`).join(',');
}

export function computeWinner(seed: string, tickets: DrawTicket[]) {
  if (!tickets.length) throw new Error('No hay tickets para sortear');
  const sorted = [...tickets].sort((a, b) => a.number - b.number);
  const ticketList = ticketListOf(sorted);
  const digest = sha256(`${seed}|${ticketList}`);
  const index = Number(BigInt('0x' + digest) % BigInt(sorted.length));
  return { winner: sorted[index], index, ticketList, digest };
}

/** Código corto para mostrar junto al ganador (derivado del digest). */
export const shortCode = (digest: string) => digest.slice(0, 16).replace(/(.{4})(?=.)/g, '$1-');
