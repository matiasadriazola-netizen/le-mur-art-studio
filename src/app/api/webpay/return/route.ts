import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { failOrder, settleOrder } from '@/lib/raffle';
import { webpay } from '@/lib/webpay';

/**
 * Webpay vuelve aquí después del pago (normalmente por POST, a veces GET):
 * - token_ws solo           → pago terminado: hay que confirmar (commit)
 * - TBK_TOKEN (+ token_ws)  → la persona anuló el pago
 * - solo TBK_ORDEN_COMPRA   → se agotó el tiempo en el formulario de pago
 */
async function handle(req: Request, params: URLSearchParams | FormData) {
  const get = (k: string) => (params.get(k) as string | null) ?? null;
  const token = get('token_ws'), tbkToken = get('TBK_TOKEN'), buyOrder = get('TBK_ORDEN_COMPRA');
  const base = process.env.APP_URL || new URL(req.url).origin;
  const go = (id?: string) => NextResponse.redirect(id ? `${base}/compra/${id}` : `${base}/`, 303);

  if (token && !tbkToken) {
    const order = await prisma.order.findUnique({ where: { token } });
    if (!order) return go();
    if (order.status === 'PAID') return go(order.id);
    try {
      const commit = await webpay().commit(token);
      await settleOrder(order.id, commit);
    } catch (e) {
      // Puede pasar si se recarga la página después de confirmar; se consulta el estado.
      console.error('webpay commit', e);
      try { const st = await webpay().status(token); await settleOrder(order.id, st); } catch { /* queda pendiente y vence sola */ }
    }
    return go(order.id);
  }
  if (tbkToken) {
    const order = await prisma.order.findUnique({ where: { token: tbkToken } });
    if (order) await failOrder(order.id, 'ABORTED');
    return go(order?.id);
  }
  if (buyOrder) {
    const order = await prisma.order.findUnique({ where: { buyOrder } });
    if (order) await failOrder(order.id, 'EXPIRED');
    return go(order?.id);
  }
  return go();
}

export async function POST(req: Request) { return handle(req, await req.formData()); }
export async function GET(req: Request) { return handle(req, new URL(req.url).searchParams); }
