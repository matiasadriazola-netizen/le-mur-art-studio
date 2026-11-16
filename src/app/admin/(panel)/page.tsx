import Link from 'next/link';
import { prisma } from '@/lib/db';
import { housekeeping, soldCounts } from '@/lib/raffle';
import { CLP, fmtDate } from '@/lib/format';
import { deleteArtwork, extendRaffle } from '../actions';
import ConfirmAction from '@/components/ConfirmAction';

const STATUS: Record<string, [string, string]> = {
  OPEN: ['open', 'Abierta'], DRAWN: ['done', 'Rematada'], CANCELLED: ['sold', 'Cancelada'], SOLD: ['sold', 'Vendida'],
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; f?: string }> }) {
  await housekeeping(true);
  const { ok, f = 'all' } = await searchParams;
  const [arts, counts, paid, refunds] = await Promise.all([
    prisma.artwork.findMany({ orderBy: [{ createdAt: 'desc' }], include: { draw: true, _count: { select: { orders: { where: { status: { in: ['PAID', 'PENDING', 'REFUND_PENDING'] } } } } } } }),
    soldCounts(),
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.order.count({ where: { status: 'REFUND_PENDING' } }),
  ]);
  const list = arts.filter((a) => f === 'all' || (f === 'closed' ? a.status !== 'OPEN' : a.type === f && a.status === 'OPEN'));
  const tickets = Object.values(counts).reduce((x, y) => x + y, 0);
  const chips = [['all', 'Todas'], ['RIFA', 'Remates'], ['VENTA', 'Venta directa'], ['closed', 'Cerradas']];
  return (
    <>
      {ok && <p className="ok" role="status" style={{ marginBottom: 14 }}>{ok}</p>}
      <div className="kpis">
        <div className="kpi dark"><b>{CLP(paid._sum.amount)}</b><span>recaudado (pagos confirmados)</span></div>
        <div className="kpi"><b>{tickets}</b><span>tickets vendidos</span></div>
        <div className="kpi"><b>{arts.filter((a) => a.status === 'OPEN').length}</b><span>obras activas</span></div>
        <div className="kpi"><b>{refunds}</b><span>{refunds ? <Link href="/admin/pagos">reembolsos pendientes</Link> : 'reembolsos pendientes'}</span></div>
      </div>
      <div className="panel" style={{ marginTop: 22 }}>
        <div className="chips" style={{ padding: 16 }}>{chips.map(([k, l]) => <Link key={k} className="chip" aria-pressed={f === k} href={`/admin?f=${k}`} style={{ textDecoration: 'none' }}>{l}</Link>)}</div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Obra</th><th>Tipo</th><th>Estado</th><th>Avance</th><th>Cierre</th><th>Precio</th><th>Ingresos</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
          <tbody>
            {list.length ? list.map((a) => {
              const s = counts[a.id] ?? 0, [cls, label] = STATUS[a.status] ?? ['open', a.status];
              const income = a.type === 'RIFA' ? s * a.price : a.status === 'SOLD' ? a.price : 0;
              return (
                <tr key={a.id}>
                  <td><div className="obra"><img src={a.imageUrl || '/seed/placeholder.svg'} alt="" /><div><b>{a.title}</b><span className="muted">{a.artist}</span></div></div></td>
                  <td>{a.type === 'RIFA' ? 'Remate' : 'Venta directa'}</td>
                  <td><span className={`pill ${cls}`}>{label}</span>{a.draw && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Ganó {a.draw.winnerName} · #{a.draw.winnerNumber}</div>}</td>
                  <td>{a.type === 'RIFA' ? <div className="mini" style={{ width: 110 }}><div className="bar"><span style={{ width: `${(s / (a.totalTickets || 1)) * 100}%` }} /></div><span className="mono muted" style={{ fontSize: 12 }}>{s}/{a.totalTickets}</span></div> : <span className="muted">—</span>}</td>
                  <td>{a.type === 'RIFA' && a.status === 'OPEN' && a.endsAt ? <span style={{ fontSize: 13 }}>{fmtDate(a.endsAt)}</span> : <span className="muted">—</span>}</td>
                  <td className="mono">{CLP(a.price)}{a.type === 'RIFA' && <span className="muted"> /ticket</span>}</td>
                  <td className="mono">{CLP(income)}</td>
                  <td><div className="acts">
                    <Link className="btn btn-line btn-sm" href={`/admin/obras/${a.id}`}>{a.status === 'OPEN' || a.draw?.external ? 'Editar' : 'Detalle'}</Link>
                    {a.type === 'RIFA' && a.status === 'OPEN' && <form action={extendRaffle}><input type="hidden" name="id" value={a.id} /><button className="btn btn-line btn-sm">+7 días</button></form>}
                    <Link className="btn btn-line btn-sm" href={`/obra/${a.slug}`}>Ver</Link>
                    {a._count.orders === 0 && <ConfirmAction action={deleteArtwork} id={a.id} label="Eliminar" confirm="¿Eliminar?" danger />}
                  </div></td>
                </tr>
              );
            }) : <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 30 }}>No hay obras en este filtro.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
