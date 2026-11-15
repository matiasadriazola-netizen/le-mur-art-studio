import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attachToken, createOrder, failOrder, UserError, validateBuyer } from '@/lib/raffle';
import { newBuyOrder, webpay } from '@/lib/webpay';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  const artworkId = String(body.artworkId ?? '');
  const artwork = await prisma.artwork.findUnique({ where: { id: artworkId }, select: { type: true } });
  if (!artwork) return NextResponse.json({ error: 'No encontramos esa obra.' }, { status: 404 });

  let orderId: string | null = null;
  try {
    const buyer = validateBuyer(body as never, artwork.type === 'VENTA');
    const buyOrder = newBuyOrder();
    const order = await createOrder(artworkId, Array.isArray(body.numbers) ? (body.numbers as number[]) : [], buyer, buyOrder);
    orderId = order.id;
    const base = process.env.APP_URL || new URL(req.url).origin;
    const tx = await webpay().create(buyOrder, order.id, order.amount, `${base}/api/webpay/return`);
    await attachToken(order.id, tx.token);
    return NextResponse.json({ url: tx.url, token: tx.token });
  } catch (e) {
    if (orderId) await failOrder(orderId, 'REJECTED');
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error('checkout', e);
    return NextResponse.json({ error: 'No pudimos conectar con Webpay. Intenta de nuevo en un momento.' }, { status: 502 });
  }
}
