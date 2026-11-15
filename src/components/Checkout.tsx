'use client';
import { useMemo, useState } from 'react';
import { CLP, pad } from '@/lib/format';
import { Icon } from './Icons';

/** Envía a la persona a Webpay con un formulario POST (token_ws), como pide Transbank. */
function goToWebpay(url: string, token: string) {
  const f = document.createElement('form');
  f.method = 'POST'; f.action = url;
  const i = document.createElement('input'); i.type = 'hidden'; i.name = 'token_ws'; i.value = token;
  f.appendChild(i); document.body.appendChild(f); f.submit();
}

async function startCheckout(payload: Record<string, unknown>) {
  const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'No pudimos iniciar el pago.');
  goToWebpay(data.url, data.token);
}

const SECURE = <div className="secure"><Icon name="lock" size={16} />Pagas en Webpay de Transbank. No vemos ni guardamos los datos de tu tarjeta.</div>;

function BuyerFields({ comuna }: { comuna?: boolean }) {
  return (
    <>
      <label>Nombre<input name="firstName" autoComplete="given-name" placeholder="Ej: Josefa" required /></label>
      <label>Apellido<input name="lastName" autoComplete="family-name" placeholder="Ej: Morales" required /></label>
      <label className="full">Correo<input name="email" type="email" autoComplete="email" placeholder="tu@correo.cl" required /></label>
      {comuna && <label className="full">Comuna de despacho<input name="comuna" autoComplete="address-level2" placeholder="Ej: Providencia" required /></label>}
    </>
  );
}

export function TicketPicker({ artworkId, total, price, sold, held, closed }: {
  artworkId: string; total: number; price: number; sold: Record<number, string>; held: number[]; closed: boolean;
}) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const heldSet = useMemo(() => new Set(held), [held]);
  const free = (n: number) => !sold[n] && !heldSet.has(n);
  const toggle = (n: number) => setSel((s) => { const c = new Set(s); c.has(n) ? c.delete(n) : c.add(n); return c; });
  const quick = (k: number) => setSel((s) => {
    if (!k) return new Set();
    const c = new Set(s); const pool = Array.from({ length: total }, (_, i) => i + 1).filter((n) => free(n) && !c.has(n));
    for (let i = 0; i < k && pool.length; i++) c.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return c;
  });
  const n = sel.size, pct = (x: number) => (Math.round((x / total) * 1000) / 10).toLocaleString('es-CL');
  const nums = [...sel].sort((a, b) => a - b);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    if (!n) return setErr('Elige al menos un número.');
    setBusy(true);
    try { await startCheckout({ artworkId, numbers: nums, ...fd }); } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span className="lbl">{closed ? 'Tickets' : 'Elige tus números'}</span>
        <div className="legend">
          <span><i style={{ background: 'var(--surface)' }} />Libre</span>
          <span><i style={{ background: 'var(--lime)', borderColor: 'var(--lime)' }} />Tu selección</span>
          <span><i style={{ background: 'var(--sold)', borderColor: 'var(--sold)' }} />Vendido</span>
          {held.length > 0 && <span><i className="tk held" style={{ height: 14 }} />Alguien está pagando</span>}
        </div>
      </div>
      {!closed && (
        <div className="qp"><span className="muted" style={{ fontSize: 13 }}>Elegir al azar:</span>
          {[1, 3, 5].map((k) => <button type="button" key={k} className="chip" onClick={() => quick(k)}>+{k}</button>)}
          <button type="button" className="chip" onClick={() => quick(0)}>Limpiar</button></div>
      )}
      <div className="tickets">
        {Array.from({ length: total }, (_, i) => i + 1).map((t) => (
          <button key={t} type="button" className={`tk${heldSet.has(t) ? ' held' : ''}`} disabled={closed || !free(t)} aria-pressed={sel.has(t)}
            title={sold[t] ? `Comprado por ${sold[t]}` : heldSet.has(t) ? 'Reservado mientras alguien paga' : `Ticket ${t} libre`} onClick={() => toggle(t)}>{pad(t)}</button>
        ))}
      </div>
      {!closed && (
        <>
          <p className="muted" style={{ fontSize: 14 }}>{n ? `Con ${n} ticket${n > 1 ? 's' : ''} tienes ${n} de ${total} posibilidades de ganar (${pct(n)}%).` : `Cada ticket es 1 de ${total} posibilidades de ganar (${pct(1)}%).`}</p>
          <form className="form" onSubmit={submit} noValidate>
            <BuyerFields />
            <div className="full total">
              <div><div className="lbl">{n ? `${n} ticket${n > 1 ? 's' : ''}: ${nums.map((x) => '#' + pad(x)).join(', ')}` : 'Sin números elegidos'}</div><div className="sum">{CLP(n * price)}</div></div>
              <button className="btn btn-brand" type="submit" disabled={!n || busy}>{busy ? 'Conectando con Webpay…' : n ? `Pagar ${CLP(n * price)} con Webpay` : 'Pagar con Webpay'}</button>
            </div>
            <p className="err full" role="alert">{err}</p>
            <div className="full">{SECURE}</div>
          </form>
        </>
      )}
    </>
  );
}

export type FrameChoice = { id: string; name: string; extra: number };

export function SaleCheckout({ artworkId, price, frames = [] }: { artworkId: string; price: number; frames?: FrameChoice[] }) {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [frameId, setFrameId] = useState(frames[0]?.id ?? '');
  const frame = frames.find((f) => f.id === frameId);
  const total = price + (frame?.extra ?? 0);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    if (frames.length && !frame) return setErr('Elige un tipo de marco.');
    setBusy(true);
    try { await startCheckout({ artworkId, frameOptionId: frameId || undefined, ...Object.fromEntries(new FormData(e.currentTarget)) }); } catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  return (
    <form className="form" onSubmit={submit} noValidate>
      {frames.length > 0 && (
        <fieldset className="full frame-pick" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ marginBottom: 8 }}>Elige el marco</legend>
          {frames.map((f) => (
            <label key={f.id}>
              <input type="radio" name="frameChoice" value={f.id} checked={frameId === f.id} onChange={() => setFrameId(f.id)} />
              {f.name}
              <span className="x">{f.extra ? `+ ${CLP(f.extra)}` : 'Incluido'}</span>
            </label>
          ))}
        </fieldset>
      )}
      <BuyerFields comuna />
      <div className="full total"><div><div className="lbl">Total{frame ? ` · ${frame.name}` : ''}</div><div className="sum">{CLP(total)}</div></div>
        <button className="btn btn-brand" type="submit" disabled={busy}>{busy ? 'Conectando con Webpay…' : `Comprar por ${CLP(total)}`}</button></div>
      <p className="err full" role="alert">{err}</p>
      <div className="full">{SECURE}</div>
    </form>
  );
}
