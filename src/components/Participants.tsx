import { fmtWhen, initials, pad } from '@/lib/format';

export type Participant = { id: string; name: string; at: Date | string; numbers: number[] };

export default function Participants({ list, total, winnerNumber }: { list: Participant[]; total: number; winnerNumber?: number | null }) {
  if (!list.length) return <div className="empty" style={{ padding: 24 }}>Todavía nadie compra tickets de esta obra. Puedes ser la primera persona.</div>;
  const people = new Set(list.map((p) => p.name)).size;
  return (
    <>
      <div className="plist-head"><span><b>{people}</b> {people === 1 ? 'persona' : 'personas'} · <b>{total}</b> tickets</span><span className="muted">Ordenado por fecha de compra</span></div>
      <ol className="plist">
        {list.map((o, i) => {
          const w = winnerNumber != null && o.numbers.includes(winnerNumber);
          return (
            <li key={o.id} className={w ? 'is-win' : ''}>
              <span className="pos mono">{i + 1}</span>
              <span className="av" aria-hidden="true">{initials(o.name)}</span>
              <div className="pinfo"><b>{o.name}{w && <span className="pill done">Ganador</span>}</b><span className="muted">{fmtWhen(o.at)} · {o.numbers.length} ticket{o.numbers.length > 1 ? 's' : ''}</span></div>
              <div className="pnums">{o.numbers.map((n) => <span key={n} className={`tnum${w && n === winnerNumber ? ' win' : ''}`}>#{pad(n)}</span>)}</div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
