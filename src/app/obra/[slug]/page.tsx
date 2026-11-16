import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { housekeeping, participants, ticketMap } from '@/lib/raffle';
import { CLP, deArtist, fmtDate, fmtLong, meta } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { Countdown } from '@/components/Timer';
import Participants from '@/components/Participants';
import Tabs from '@/components/Tabs';
import Gallery from '@/components/Gallery';
import { SaleCheckout, TicketPicker } from '@/components/Checkout';

const POLICY_TXT: Record<string, string> = {
  DRAW: 'Si no se venden todos los tickets antes del cierre, se elige igual un ganador entre los números vendidos.',
  EXTEND: 'Si no se completa a tiempo, el plazo se extiende 7 días.',
  CANCEL: 'Si no se completa a tiempo, el remate se cancela y se devuelve el 100% del dinero.',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await prisma.artwork.findUnique({ where: { slug: (await params).slug } });
  return { title: a ? meta(a.title, a.artist) : 'Obra' };
}

export default async function ObraPage({ params }: { params: Promise<{ slug: string }> }) {
  await housekeeping();
  const a = await prisma.artwork.findUnique({ where: { slug: (await params).slug }, include: { draw: true, images: { orderBy: { position: 'asc' } }, frameOptions: { orderBy: { position: 'asc' } }, categories: { orderBy: { name: 'asc' } } } });
  if (!a) notFound();
  const photos = a.images.length ? a.images.map((i) => i.url) : a.imageUrl ? [a.imageUrl] : [];

  const specs = (
    <dl className="specs">
      {a.artist && <><dt>Artista</dt><dd>{a.artist}</dd></>}{a.technique && <><dt>Tipo</dt><dd>{a.technique}</dd></>}{a.size && <><dt>Medidas</dt><dd>{a.size}</dd></>}{a.frame && <><dt>Marco</dt><dd>{a.frame}</dd></>}
      {a.value ? <><dt>Valor referencial</dt><dd className="mono">{CLP(a.value)}</dd></> : null}
      {a.categories.length > 0 && <><dt>Categorías</dt><dd>{a.categories.map((c, i) => <span key={c.id}>{i > 0 && ', '}<Link href={`/?categoria=${c.slug}#explorar`}>{c.name}</Link></span>)}</dd></>}
      <dt>Certificado</dt><dd>Firmado por el artista</dd>
      <dt>Publicado</dt><dd>{a.createdAt.toLocaleDateString('es-CL', { dateStyle: 'long' })}</dd>
    </dl>
  );

  if (a.type === 'VENTA') {
    const reserved = a.status === 'OPEN' && a.reservedUntil && a.reservedUntil > new Date();
    return (
      <main className="wrap page">
        <Link className="back" href="/#venta"><Icon name="left" size={16} />Volver a venta directa</Link>
        <div className="detail">
          <div className="art"><Gallery photos={photos} title={a.title} />{specs}{a.description && <p className="muted" style={{ fontSize: 14 }}>{a.description}</p>}</div>
          <div className="buy">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              {a.status === 'SOLD' ? <span className="pill sold">Vendido</span> : <span className="pill sale">Venta directa · Precio único</span>}
              <h1>{a.title}</h1>{meta(a.artist, a.technique, a.size) && <span className="muted">{meta(a.artist, a.technique, a.size)}</span>}
            </div>
            <div className="counter"><b>{CLP(a.price)}</b><span className="muted">{a.frameOptions.some((f) => f.extra > 0) ? 'precio base · el marco se elige abajo' : 'obra única · incluye embalaje'}</span></div>
            {a.status === 'SOLD' ? (
              <div className="result"><span className="lbl">Esta obra ya fue vendida</span><span>Mira los remates activos: puede haber otra obra{deArtist(a.artist)}.</span><Link className="btn btn-line" href="/#remates" style={{ alignSelf: 'flex-start' }}>Ver remates por ticket</Link></div>
            ) : reserved ? (
              <div className="result"><span className="lbl">Reservada</span><span>Otra persona está pagando esta obra en este momento. Si no completa el pago, vuelve a estar disponible a las {a.reservedUntil!.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })}.</span></div>
            ) : (
              <SaleCheckout artworkId={a.id} price={a.price} frames={a.frameOptions.map((f) => ({ id: f.id, name: f.name, extra: f.extra }))} />
            )}
          </div>
        </div>
      </main>
    );
  }

  const [{ sold, held }, plist] = await Promise.all([ticketMap(a.id), participants(a.id)]);
  const external = !!a.draw?.external;
  const total = a.totalTickets ?? 0, soldN = external ? a.draw!.ticketsSold : Object.keys(sold).length, closed = a.status !== 'OPEN';
  const people = new Set(plist.map((p) => p.name)).size;
  const left = total - soldN - held.length;

  return (
    <main className="wrap page">
      <Link className="back" href="/#remates"><Icon name="left" size={16} />Volver a remates</Link>
      <div className="detail">
        <div className="art"><Gallery photos={photos} title={a.title} /></div>
        <div className="buy">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            {a.status === 'DRAWN' ? <span className="pill done">Rematado</span> : a.status === 'CANCELLED' ? <span className="pill sold">Cancelado</span>
              : left <= 3 ? <span className="pill hot">{left === 1 ? 'Queda 1 ticket' : `Quedan ${left}`}</span> : <span className="pill open">Disponible</span>}
            <h1>{a.title}</h1>{meta(a.artist, a.technique, a.size) && <span className="muted">{meta(a.artist, a.technique, a.size)}</span>}
          </div>
          <div className="dstats">
            <div><b>{a.price ? CLP(a.price) : '—'}</b><span>por ticket</span></div>
            <div><b>{soldN}/{total}</b><span>vendidos</span></div>
            <div><b>{closed ? 0 : Math.max(0, left)}</b><span>disponibles</span></div>
            <div><b>{a.value ? CLP(a.value) : '—'}</b><span>valor de la obra</span></div>
          </div>
          <div className="bar"><span style={{ width: `${(soldN / (total || 1)) * 100}%` }} /></div>

          {!closed && a.endsAt && (
            <div className="deadline">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><span className="lbl">La venta de tickets cierra en</span><span className="muted" style={{ fontSize: 13 }}>{fmtDate(a.endsAt)}</span></div>
              <Countdown endsAt={a.endsAt.toISOString()} />
              <span className="muted" style={{ fontSize: 13 }}>{POLICY_TXT[a.policy ?? 'DRAW']}</span>
            </div>
          )}
          {a.draw && (
            <div className="result">
              <span className="lbl">Ganador del remate</span><span className="big">{a.draw.winnerName}</span>
              <span>Ticket <span className="tnum">#{a.draw.winnerNumber}</span> · {fmtLong(a.draw.createdAt)}</span>
              {a.draw.partial && <span className="muted" style={{ fontSize: 13 }}>Se cumplió el plazo y se eligió al ganador entre los {a.draw.ticketsSold} tickets vendidos.</span>}
              {external
                ? <span className="muted" style={{ fontSize: 14 }}>Remate realizado en vivo{a.draw.proofUrl ? <> · <a href={a.draw.proofUrl} target="_blank" rel="noopener noreferrer">Ver el remate</a></> : null}</span>
                : <span className="code mono">Código: {a.draw.code} · <Link href={`/verificar/${a.slug}`}>Verificar remate</Link></span>}
            </div>
          )}
          {a.status === 'CANCELLED' && <div className="result"><span className="lbl">Remate cancelado</span><span>Se cumplió el plazo sin completar los tickets. Se devuelve el dinero a todos los compradores.</span></div>}

          {external ? (
            <div className="dpanel">{specs}{a.description && <p className="muted" style={{ fontSize: 14 }}>{a.description}</p>}</div>
          ) : <Tabs
            initial={closed ? 'participantes' : 'comprar'}
            tabs={[
              { key: 'comprar', label: closed ? 'Tickets' : 'Comprar tickets', content: <TicketPicker artworkId={a.id} total={total} price={a.price} sold={sold} held={held} closed={closed} /> },
              { key: 'participantes', label: `Participantes (${people})`, content: <Participants list={plist} total={soldN} winnerNumber={a.draw?.winnerNumber} /> },
              {
                key: 'obra', label: 'Sobre la obra', content: (
                  <>
                    {specs}
                    {a.description && <p className="muted" style={{ fontSize: 14 }}>{a.description}</p>}
                    <div className="result"><span className="lbl">Reglas del remate</span>
                      <ul className="rules">
                        <li>El remate se hace automáticamente cuando se vende el último ticket{a.endsAt && !closed ? `, o al cierre del ${fmtDate(a.endsAt)}` : ''}.</li>
                        <li>{POLICY_TXT[a.policy ?? 'DRAW']}</li>
                        <li>Cada ticket es una posibilidad de ganar. Puedes comprar varios números.</li>
                        <li>El ganador se publica con nombre, inicial del apellido, número y una prueba verificable.</li>
                      </ul>
                    </div>
                    <div className="verify-box"><span className="lbl">Remate verificable</span>
                      <span style={{ fontSize: 14 }}>Huella de la semilla secreta, publicada antes del remate:</span><code>{a.seedHash}</code>
                      <Link href={`/verificar/${a.slug}`} style={{ fontSize: 14 }}>Cómo se verifica</Link></div>
                  </>
                ),
              },
            ]}
          />}
        </div>
      </div>
    </main>
  );
}
