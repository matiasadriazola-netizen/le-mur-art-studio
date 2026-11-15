import { prisma } from '@/lib/db';
import { CLP, fmtWhen } from '@/lib/format';
import { refundOrder } from '../../actions';
import ConfirmAction from '@/components/ConfirmAction';

const LABEL: Record<string, [string, string]> = {
  PAID: ['done', 'Pagado'], PENDING: ['open', 'En pago'], REJECTED: ['sold', 'Rechazado'], ABORTED: ['sold', 'Anulado'],
  EXPIRED: ['sold', 'Vencido'], REFUND_PENDING: ['hot', 'Por reembolsar'], REFUNDED: ['sold', 'Reembolsado'],
};

export default async function Pagos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = 'all' } = await searchParams;
  const where = f === 'refund' ? { status: 'REFUND_PENDING' } : f === 'paid' ? { status: 'PAID' } : {};
  const orders = await prisma.order.findMany({ where, include: { artwork: { select: { title: true, type: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (
    <div className="panel">
      <div className="chips" style={{ padding: 16 }}>
        {[['all', 'Todos'], ['paid', 'Pagados'], ['refund', 'Por reembolsar']].map(([k, l]) => <a key={k} className="chip" aria-pressed={f === k} href={`/admin/pagos?f=${k}`} style={{ textDecoration: 'none' }}>{l}</a>)}
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Fecha</th><th>Orden</th><th>Comprador</th><th>Obra</th><th>Tickets</th><th>Monto</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
        <tbody>
          {orders.length ? orders.map((o) => {
            const [cls, label] = LABEL[o.status] ?? ['open', o.status];
            return (
              <tr key={o.id}>
                <td style={{ fontSize: 13 }}>{fmtWhen(o.createdAt)}</td>
                <td className="mono" style={{ fontSize: 12 }}>{o.buyOrder}{o.authCode && <div className="muted">aut. {o.authCode}</div>}</td>
                <td>{o.firstName} {o.lastName}<div className="muted" style={{ fontSize: 12 }}>{o.email}{o.comuna ? ` · ${o.comuna}` : ''}</div></td>
                <td>{o.artwork.title}</td>
                <td className="mono" style={{ fontSize: 12 }}>{o.numbers ? o.numbers.split(',').map((n) => '#' + n).join(' ') : '—'}</td>
                <td className="mono">{CLP(o.amount)}</td>
                <td><span className={`pill ${cls}`}>{label}</span>{o.note && <div className="muted" style={{ fontSize: 12, marginTop: 4, maxWidth: 240 }}>{o.note}</div>}</td>
                <td><div className="acts">{o.status === 'REFUND_PENDING' && <ConfirmAction action={refundOrder} id={o.id} label="Reembolsar por Webpay" confirm={`¿Devolver ${CLP(o.amount)}?`} />}</div></td>
              </tr>
            );
          }) : <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 30 }}>No hay pagos en este filtro.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
