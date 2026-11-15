import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { participants } from '@/lib/raffle';
import { CLP, fmtLong, meta, publicName, toChileInput } from '@/lib/format';
import Participants from '@/components/Participants';
import ArtworkForm from '../../../ArtworkForm';
import { cancelNow, drawNow } from '../../../actions';
import ConfirmAction from '@/components/ConfirmAction';
import { techniqueOptions } from '@/lib/techniques';

export default async function EditObra({ params }: { params: Promise<{ id: string }> }) {
  const a = await prisma.artwork.findUnique({ where: { id: (await params).id }, include: { draw: true, images: { orderBy: { position: 'asc' } } } });
  if (!a) notFound();
  const held = await prisma.ticket.count({ where: { artworkId: a.id, order: { status: { in: ['PAID', 'PENDING'] } } } });
  const plist = a.type === 'RIFA' ? await participants(a.id) : [];
  const buyer = a.type === 'VENTA' ? await prisma.order.findFirst({ where: { artworkId: a.id, status: 'PAID' } }) : null;
  const soldN = plist.reduce((n, p) => n + p.numbers.length, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {a.status === 'OPEN' ? (
        <ArtworkForm techniques={await techniqueOptions()} initial={{ id: a.id, type: a.type as 'RIFA' | 'VENTA', title: a.title, artist: a.artist, technique: a.technique, size: a.size, value: a.value, description: a.description ?? '', price: a.price, totalTickets: a.totalTickets ?? 20, endsAt: a.endsAt ? toChileInput(a.endsAt) : '', policy: a.policy ?? 'DRAW', photos: a.images.length ? a.images.map((i) => i.url) : a.imageUrl ? [a.imageUrl] : [], soldOrHeld: held }} />
      ) : (
        <div className="panel" style={{ padding: 24 }}><h2 style={{ fontSize: 26 }}>{a.title}</h2><p className="muted">{meta(a.artist, a.size, CLP(a.price) + (a.type === 'RIFA' ? ' por ticket' : ''))}</p>
          {a.draw && <p style={{ marginTop: 10 }}>Ganó <b>{a.draw.winnerName}</b> con el ticket #{a.draw.winnerNumber} · {fmtLong(a.draw.createdAt)} · código {a.draw.code} · <Link href={`/verificar/${a.slug}`}>verificación</Link></p>}
          {a.status === 'CANCELLED' && <p style={{ marginTop: 10 }}>Sorteo cancelado. Los reembolsos están en <Link href="/admin/pagos">Pagos y reembolsos</Link>.</p>}
          {buyer && <p style={{ marginTop: 10 }}>Comprada por <b>{publicName(buyer.firstName, buyer.lastName)}</b> ({buyer.email}) · despacho a {buyer.comuna} · {buyer.paidAt && fmtLong(buyer.paidAt)}</p>}
        </div>
      )}
      {a.type === 'RIFA' && (
        <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <h2 style={{ fontSize: 24 }}>Participantes</h2>
            {a.status === 'OPEN' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {soldN > 0 && <ConfirmAction action={drawNow} id={a.id} label="Sortear ahora entre los vendidos" confirm={`¿Sortear ahora entre ${soldN} tickets? No se puede deshacer.`} />}
                <ConfirmAction action={cancelNow} id={a.id} label="Cancelar sorteo" confirm="¿Cancelar? Los pagos quedan para reembolso." danger />
              </div>
            )}
          </div>
          <Participants list={plist} total={soldN} winnerNumber={a.draw?.winnerNumber} />
        </div>
      )}
    </div>
  );
}
