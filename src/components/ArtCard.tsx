import Link from 'next/link';
import { CLP } from '@/lib/format';
import type { CardItem } from '@/lib/catalog';
import { TimerPill } from './Timer';

export function gpillText(a: CardItem) {
  if (a.type === 'VENTA') return a.status === 'SOLD' ? 'Vendido' : 'Venta directa';
  if (a.status === 'DRAWN') return 'Sorteado';
  if (a.status === 'CANCELLED') return 'Cancelado';
  const l = (a.totalTickets ?? 0) - a.sold;
  return l <= 3 ? (l === 1 ? 'Queda 1 ticket' : `Quedan ${l} tickets`) : `Sorteo · ${a.sold}/${a.totalTickets}`;
}
export const isHot = (a: CardItem) => a.type === 'RIFA' && a.status === 'OPEN' && (a.totalTickets ?? 0) - a.sold <= 3;

export function Img({ a, className }: { a: { imageUrl: string | null; title: string }; className?: string }) {
  return <img className={className} src={a.imageUrl || '/seed/placeholder.svg'} alt={a.title} loading="lazy" />;
}

export default function ArtCard({ a }: { a: CardItem }) {
  const open = a.status === 'OPEN';
  return (
    <Link className={`card${a.type === 'VENTA' && a.status === 'SOLD' ? ' is-sold' : ''}`} href={`/obra/${a.slug}`}>
      <div className="img">
        <Img a={a} />
        <span className={`gpill${isHot(a) ? ' lime' : ''}`}>{gpillText(a)}</span>
        {a.type === 'RIFA' && open && a.endsAt && <TimerPill endsAt={a.endsAt} />}
      </div>
      <div className="body">
        <div><h3>{a.title}</h3><span className="by">{a.artist} · {a.size}</span></div>
        {a.type === 'VENTA' ? (
          <div className="row"><span className="price">{CLP(a.price)}</span><span className="more">{open ? 'Comprar' : 'Vendido'} <svg className="icon" style={{ width: 16, height: 16 }}><use href="#i-right" /></svg></span></div>
        ) : a.status === 'DRAWN' ? (
          <div className="winner">Ganó <b>{a.winnerName}</b> con el <span className="tnum">#{a.winnerNumber}</span></div>
        ) : a.status === 'CANCELLED' ? (
          <div className="winner">Cancelado · se reembolsa a los compradores</div>
        ) : (
          <>
            <div className="bar" aria-hidden="true"><span style={{ width: `${(a.sold / (a.totalTickets || 1)) * 100}%` }} /></div>
            <div className="row"><span className="price">{CLP(a.price)}<span className="muted" style={{ fontSize: 13, fontFamily: 'var(--f-sans)' }}> /ticket</span></span><span className="mono muted" style={{ fontSize: 13 }}>{a.sold}/{a.totalTickets}</span></div>
          </>
        )}
      </div>
    </Link>
  );
}
