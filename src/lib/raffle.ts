import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { computeWinner, shortCode } from './draw';
import { sendMail } from './mail';
import { CLP, deArtist, fmtLong, publicName } from './format';

/** Minutos que se reservan los números (o la obra) mientras la persona paga en Webpay. */
export const HOLD_MINUTES = 15;
const holdLimit = () => new Date(Date.now() - HOLD_MINUTES * 60_000);

export class UserError extends Error {}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

export async function paidTickets(artworkId: string) {
  return prisma.ticket.findMany({
    where: { artworkId, order: { status: 'PAID' } },
    include: { order: { select: { id: true, firstName: true, lastName: true, paidAt: true } } },
    orderBy: { number: 'asc' },
  });
}

/** Compras pagadas de una obra, en orden de pago. */
export async function participants(artworkId: string) {
  const orders = await prisma.order.findMany({
    where: { artworkId, status: 'PAID' },
    include: { tickets: { select: { number: true }, orderBy: { number: 'asc' } } },
    orderBy: { paidAt: 'asc' },
  });
  return orders.map((o) => ({
    id: o.id,
    name: publicName(o.firstName, o.lastName),
    at: o.paidAt ?? o.createdAt,
    numbers: o.tickets.map((t) => t.number),
  }));
}

/** Estado de cada número: vendido (con nombre) o reservado mientras alguien paga. */
export async function ticketMap(artworkId: string) {
  const tickets = await prisma.ticket.findMany({
    where: { artworkId, order: { status: { in: ['PAID', 'PENDING'] } } },
    include: { order: { select: { status: true, firstName: true, lastName: true } } },
  });
  const sold: Record<number, string> = {};
  const held: number[] = [];
  for (const t of tickets) {
    if (t.order.status === 'PAID') sold[t.number] = publicName(t.order.firstName, t.order.lastName);
    else held.push(t.number);
  }
  return { sold, held };
}

export async function soldCounts() {
  const rows = await prisma.ticket.groupBy({ by: ['artworkId'], where: { order: { status: 'PAID' } }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.artworkId, r._count._all])) as Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Mantenimiento: reservas vencidas y plazos de sorteo                 */
/* ------------------------------------------------------------------ */

export async function releaseStale() {
  const stale = await prisma.order.findMany({ where: { status: 'PENDING', createdAt: { lt: holdLimit() } }, select: { id: true } });
  if (!stale.length) return 0;
  const ids = stale.map((o) => o.id);
  await prisma.$transaction([
    prisma.ticket.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRED' } }),
    prisma.artwork.updateMany({ where: { reservedOrderId: { in: ids } }, data: { reservedOrderId: null, reservedUntil: null } }),
  ]);
  return ids.length;
}

export async function processExpired() {
  const due = await prisma.artwork.findMany({ where: { type: 'RIFA', status: 'OPEN', endsAt: { lte: new Date() } } });
  for (const a of due) {
    const sold = await prisma.ticket.count({ where: { artworkId: a.id, order: { status: 'PAID' } } });
    if (a.totalTickets && sold >= a.totalTickets) { await runDraw(a.id, false); continue; }
    // Si alguien está pagando justo ahora, se espera a que termine.
    const pending = await prisma.order.count({ where: { artworkId: a.id, status: 'PENDING' } });
    if (pending) continue;
    const policy = a.policy ?? 'DRAW';
    if (policy === 'EXTEND') {
      await prisma.artwork.update({ where: { id: a.id }, data: { endsAt: new Date(Date.now() + 7 * 86_400_000) } });
    } else if (policy === 'DRAW' && sold > 0) {
      await runDraw(a.id, true);
    } else {
      await cancelRaffle(a.id, 'Se cumplió el plazo sin completar los tickets.');
    }
  }
}

let lastRun = 0;
/** Se llama al cargar páginas y APIs; corre como máximo cada 20 segundos. */
export async function housekeeping(force = false) {
  if (!force && Date.now() - lastRun < 20_000) return;
  lastRun = Date.now();
  await releaseStale();
  await processExpired();
}

/* ------------------------------------------------------------------ */
/* Sorteo                                                              */
/* ------------------------------------------------------------------ */

export async function runDraw(artworkId: string, partial: boolean) {
  const result = await prisma.$transaction(async (tx) => {
    const a = await tx.artwork.findUnique({ where: { id: artworkId }, include: { draw: true } });
    if (!a || a.type !== 'RIFA' || a.draw || a.status !== 'OPEN' || !a.seed) return null;
    const tickets = await tx.ticket.findMany({
      where: { artworkId, order: { status: 'PAID' } },
      include: { order: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!tickets.length) return null;
    const r = computeWinner(a.seed, tickets.map((t) => ({ number: t.number, orderId: t.orderId })));
    const win = tickets.find((t) => t.number === r.winner.number)!;
    const draw = await tx.draw.create({
      data: {
        artworkId, winnerNumber: win.number, winnerName: publicName(win.order.firstName, win.order.lastName), orderId: win.orderId,
        ticketsSold: tickets.length, partial, ticketList: r.ticketList, digest: r.digest, code: shortCode(r.digest),
      },
    });
    await tx.artwork.update({ where: { id: artworkId }, data: { status: 'DRAWN' } });
    return { a, draw, email: win.order.email };
  });
  if (result) {
    await sendMail(result.email, `¡Ganaste "${result.a.title}"!`,
      `Tu ticket #${result.draw.winnerNumber} ganó el sorteo de "${result.a.title}"${deArtist(result.a.artist)}.\nCódigo de verificación: ${result.draw.code}\nTe contactaremos para coordinar la entrega.`);
  }
  return result?.draw ?? null;
}

export async function cancelRaffle(artworkId: string, reason: string) {
  await prisma.$transaction([
    prisma.order.updateMany({ where: { artworkId, status: 'PAID' }, data: { status: 'REFUND_PENDING', note: reason } }),
    prisma.artwork.update({ where: { id: artworkId }, data: { status: 'CANCELLED' } }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Compra                                                              */
/* ------------------------------------------------------------------ */

export type Buyer = { firstName: string; lastName: string; email: string; comuna?: string };

export function validateBuyer(b: Partial<Buyer>, needsComuna: boolean): Buyer {
  const firstName = (b.firstName ?? '').trim().slice(0, 40), lastName = (b.lastName ?? '').trim().slice(0, 40);
  const email = (b.email ?? '').trim().toLowerCase().slice(0, 120), comuna = (b.comuna ?? '').trim().slice(0, 60);
  if (!firstName || !lastName) throw new UserError('Escribe tu nombre y apellido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError('Revisa el correo; ahí te llega la confirmación.');
  if (needsComuna && !comuna) throw new UserError('Indica la comuna para coordinar el despacho.');
  return { firstName, lastName, email, comuna: comuna || undefined };
}

/** Crea la orden y reserva los números (sorteo) o la obra (venta directa) antes de ir a Webpay. */
export async function createOrder(artworkId: string, numbers: number[], buyer: Buyer, buyOrder: string) {
  await housekeeping(true);
  const a = await prisma.artwork.findUnique({ where: { id: artworkId } });
  if (!a || a.status !== 'OPEN') throw new UserError('Esta obra ya no está disponible.');

  if (a.type === 'RIFA') {
    const nums = [...new Set(numbers.map(Number))].filter((n) => Number.isInteger(n)).sort((x, y) => x - y);
    if (!nums.length) throw new UserError('Elige al menos un número.');
    if (nums.length > 50) throw new UserError('Puedes comprar hasta 50 tickets por compra.');
    if (nums.some((n) => n < 1 || n > (a.totalTickets ?? 0))) throw new UserError('Hay números fuera de rango.');
    if (a.endsAt && a.endsAt <= new Date()) throw new UserError('La venta de tickets de esta obra ya cerró.');
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: { artworkId, ...buyer, numbers: nums.join(','), amount: nums.length * a.price, buyOrder },
        });
        await tx.ticket.createMany({ data: nums.map((number) => ({ artworkId, number, orderId: order.id })) });
        return order;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new UserError('Alguien tomó uno de esos números hace un momento. Elige otros.');
      throw e;
    }
  }

  // Venta directa: reserva atómica de la obra
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { artworkId, ...buyer, amount: a.price, buyOrder } });
    const res = await tx.artwork.updateMany({
      where: { id: artworkId, status: 'OPEN', OR: [{ reservedUntil: null }, { reservedUntil: { lt: new Date() } }] },
      data: { reservedOrderId: order.id, reservedUntil: new Date(Date.now() + HOLD_MINUTES * 60_000) },
    });
    if (res.count !== 1) throw new UserError('Otra persona está comprando esta obra en este momento. Intenta en unos minutos.');
    return order;
  });
}

export async function attachToken(orderId: string, token: string) {
  await prisma.order.update({ where: { id: orderId }, data: { token } });
}

/** Libera números/obra de una orden que no se pagó. */
export async function failOrder(orderId: string, status: 'REJECTED' | 'ABORTED' | 'EXPIRED') {
  await prisma.$transaction([
    prisma.ticket.deleteMany({ where: { orderId } }),
    prisma.order.updateMany({ where: { id: orderId, status: 'PENDING' }, data: { status } }),
    prisma.artwork.updateMany({ where: { reservedOrderId: orderId }, data: { reservedOrderId: null, reservedUntil: null } }),
  ]);
}

type Commit = { status?: string; response_code?: number; amount?: number; authorization_code?: string; card_detail?: { card_number?: string } };

/** Procesa la respuesta de commit de Webpay. */
export async function settleOrder(orderId: string, c: Commit) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { artwork: true } });
  if (!order) return null;
  if (order.status === 'PAID') return order;
  const ok = c.status === 'AUTHORIZED' && c.response_code === 0 && c.amount === order.amount;
  if (!ok) { await failOrder(order.id, 'REJECTED'); return order; }

  const payment = { authCode: c.authorization_code ?? null, cardLast4: c.card_detail?.card_number ?? null, paidAt: new Date() };

  if (order.status !== 'PENDING') {
    // Pagó después de que venció la reserva: se intenta recuperar; si no se puede, queda para reembolso.
    const recovered = await recoverLate(order.id, order.artworkId, order.numbers, order.artwork.type);
    if (!recovered) {
      await prisma.order.update({ where: { id: order.id }, data: { ...payment, status: 'REFUND_PENDING', note: 'Pago recibido después de vencer la reserva; los números u obra ya no estaban disponibles.' } });
      return order;
    }
  }

  await prisma.order.update({ where: { id: order.id }, data: { ...payment, status: 'PAID' } });
  const a = order.artwork;
  if (a.type === 'VENTA') {
    await prisma.artwork.update({ where: { id: a.id }, data: { status: 'SOLD', reservedOrderId: null, reservedUntil: null } });
    await sendMail(order.email, `Compraste "${a.title}"`, `Pagaste ${CLP(order.amount)} por "${a.title}"${deArtist(a.artist)}. Te contactaremos para coordinar el despacho a ${order.comuna ?? 'tu comuna'}.`);
  } else {
    await sendMail(order.email, `Tus tickets para "${a.title}"`,
      `Compraste los tickets ${order.numbers.split(',').map((n) => '#' + n).join(', ')} por ${CLP(order.amount)}.\nEl sorteo se hace al venderse el último ticket${a.endsAt ? ` o el ${fmtLong(a.endsAt)}` : ''}.`);
    const sold = await prisma.ticket.count({ where: { artworkId: a.id, order: { status: 'PAID' } } });
    if (a.totalTickets && sold >= a.totalTickets) await runDraw(a.id, false);
  }
  return order;
}

async function recoverLate(orderId: string, artworkId: string, numbers: string, type: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const a = await tx.artwork.findUnique({ where: { id: artworkId } });
      if (!a || a.status !== 'OPEN') return false;
      if (type === 'RIFA') {
        const nums = numbers.split(',').map(Number).filter(Boolean);
        await tx.ticket.createMany({ data: nums.map((number) => ({ artworkId, number, orderId })) });
        return true;
      }
      const res = await tx.artwork.updateMany({
        where: { id: artworkId, status: 'OPEN', OR: [{ reservedUntil: null }, { reservedUntil: { lt: new Date() } }, { reservedOrderId: orderId }] },
        data: { reservedOrderId: orderId },
      });
      return res.count === 1;
    });
  } catch {
    return false;
  }
}
