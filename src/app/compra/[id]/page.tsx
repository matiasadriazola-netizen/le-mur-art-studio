import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CLP, fmtLong, meta, pad } from '@/lib/format';

export const metadata = { title: 'Resultado de tu compra', robots: { index: false } };

export default async function CompraPage({ params }: { params: Promise<{ id: string }> }) {
  const o = await prisma.order.findUnique({ where: { id: (await params).id }, include: { artwork: { include: { draw: true } } } });
  if (!o) notFound();
  const a = o.artwork, nums = o.numbers ? o.numbers.split(',').map(Number) : [];
  const won = a.draw && nums.includes(a.draw.winnerNumber) && a.draw.orderId === o.id;

  let title = '', body: React.ReactNode = null, tone = 'muted';
  switch (o.status) {
    case 'PAID':
      tone = 'ok';
      title = a.type === 'VENTA' ? '¡La obra es tuya!' : '¡Tus tickets están confirmados!';
      body = a.type === 'VENTA'
        ? <p>Pagaste {CLP(o.amount)} por “{a.title}”. Te escribiremos a {o.email} para coordinar el despacho a {o.comuna}.</p>
        : <p>Compraste {nums.length} ticket{nums.length > 1 ? 's' : ''} para “{a.title}”: {nums.map((n) => <span key={n} className="tnum" style={{ marginRight: 4 }}>#{pad(n)}</span>)}. Te avisaremos a {o.email} cuando se haga el sorteo.</p>;
      break;
    case 'PENDING': title = 'Estamos confirmando tu pago'; body = <p>Recarga esta página en unos segundos.</p>; break;
    case 'ABORTED': title = 'Anulaste el pago'; body = <p>No se hizo ningún cargo y los números quedaron libres. Puedes intentarlo de nuevo.</p>; break;
    case 'EXPIRED': title = 'Se agotó el tiempo para pagar'; body = <p>No se hizo ningún cargo. Vuelve a la obra para intentarlo de nuevo.</p>; break;
    case 'REJECTED': title = 'El pago no se completó'; body = <p>Webpay rechazó el pago o no pudo confirmarse. No se hizo ningún cargo. Puedes intentarlo con otra tarjeta.</p>; break;
    case 'REFUND_PENDING': case 'REFUNDED':
      title = 'Tu pago será devuelto'; body = <p>{o.note ?? 'Hubo un problema con tu compra.'} Te devolveremos {CLP(o.amount)} a la misma tarjeta y te escribiremos a {o.email}.</p>; break;
  }

  return (
    <main className="wrap page" style={{ paddingBottom: 64 }}>
      <div className="status-card">
        <span className="lbl">Orden {o.buyOrder}</span>
        <h1 style={{ color: tone === 'ok' ? 'var(--ok)' : undefined }}>{title}</h1>
        {body}
        {won && <div className="result"><span className="lbl">Ganaste</span><span className="big">Tu ticket #{a.draw!.winnerNumber} ganó el sorteo</span></div>}
        {o.status === 'PAID' && (
          <dl className="specs">
            <dt>Obra</dt><dd>{meta(a.title, a.artist)}</dd><dt>Monto</dt><dd className="mono">{CLP(o.amount)}</dd>
            {o.authCode && <><dt>Autorización</dt><dd className="mono">{o.authCode}</dd></>}
            {o.cardLast4 && <><dt>Tarjeta</dt><dd className="mono">**** {o.cardLast4}</dd></>}
            {o.paidAt && <><dt>Fecha</dt><dd>{fmtLong(o.paidAt)}</dd></>}
          </dl>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-brand" href={`/obra/${a.slug}`}>Ver la obra</Link>
          <Link className="btn btn-line" href="/">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}
