'use client';
import { useEffect, useState } from 'react';
import type { CardItem } from '@/lib/catalog';
import ArtCard from './ArtCard';

const FILTERS = {
  RIFA: [['all', 'Todos'], ['open', 'Disponibles'], ['hot', 'Por cerrar'], ['done', 'Sorteados']],
  VENTA: [['all', 'Todos'], ['open', 'En venta'], ['sold', 'Vendidos']],
} as const;

export default function Explore({ items }: { items: CardItem[] }) {
  const [mode, setMode] = useState<'RIFA' | 'VENTA'>('RIFA');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const sync = () => { if (location.hash === '#venta') { setMode('VENTA'); setFilter('all'); } if (location.hash === '#sorteos') { setMode('RIFA'); setFilter('all'); } };
    sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync);
  }, []);
  const now = Date.now();
  const list = items.filter((a) => a.type === mode).filter((a) => {
    if (filter === 'all') return true;
    if (mode === 'VENTA') return filter === 'sold' ? a.status === 'SOLD' : a.status === 'OPEN';
    if (filter === 'done') return a.status === 'DRAWN';
    if (filter === 'hot') return a.status === 'OPEN' && ((a.totalTickets ?? 0) - a.sold <= 3 || (a.endsAt ? Date.parse(a.endsAt) - now < 86_400_000 : false));
    return a.status === 'OPEN';
  }).sort((a, b) => Number(a.status !== 'OPEN') - Number(b.status !== 'OPEN'));
  const count = (t: string) => items.filter((a) => a.type === t && a.status === 'OPEN').length;
  return (
    <>
      <div className="sec-head">
        <div><span className="tag">Explorar</span><h2>Todas las obras</h2></div>
        <p className="sec-sub">{mode === 'RIFA' ? 'Compra uno o más números. Cuando se venden todos, el sistema sortea al ganador.' : 'Obras a precio único. La primera persona que paga se lleva el cuadro.'}</p>
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Tipo de compra">
          {(['RIFA', 'VENTA'] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => { setMode(m); setFilter('all'); }}>
              {m === 'RIFA' ? 'Sorteos por ticket' : 'Venta directa'} <span className="count">{count(m)}</span>
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Filtrar">
          {FILTERS[mode].map(([k, l]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
      </div>
      <div className="grid">
        {list.length ? list.map((a) => <ArtCard key={a.id} a={a} />) : <div className="empty">No hay obras en este filtro.</div>}
      </div>
    </>
  );
}
